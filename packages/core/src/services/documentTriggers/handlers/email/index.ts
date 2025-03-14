import {
  BadRequestError,
  LatitudeError,
  PromisedResult,
  Result,
} from '../../../../lib'
import { findUnscopedDocumentTriggers } from '../../find'
import {
  DocumentTriggerType,
  EMAIL_TRIGGER_DOMAIN,
} from '@latitude-data/constants'
import { database } from '../../../../client'
import { DocumentTrigger, HEAD_COMMIT } from '../../../../browser'
import { DocumentTriggerMailer } from '../../../../mailers'
import { getEmailResponse } from './getResponse'
import { DocumentVersionsRepository } from '../../../../repositories'
import { EmailTriggerConfiguration } from '../../helpers/schema'

async function getTriggerName(
  trigger: DocumentTrigger,
  db = database,
): PromisedResult<string, LatitudeError> {
  const configName = (
    trigger.configuration as EmailTriggerConfiguration
  ).name?.trim()
  if (configName?.length) {
    return Result.ok(configName)
  }

  const docsScope = new DocumentVersionsRepository(trigger.workspaceId, db)
  const documentResult = await docsScope.getDocumentAtCommit({
    projectId: trigger.projectId,
    commitUuid: HEAD_COMMIT,
    documentUuid: trigger.documentUuid,
  })
  if (documentResult.error) return documentResult

  const document = documentResult.unwrap()
  const docName = document.path.split('/').pop()!
  return Result.ok(docName)
}

export async function assertTriggerFilters({
  sender,
  trigger,
}: {
  sender: string
  trigger: DocumentTrigger
}): PromisedResult<undefined> {
  const configuration = trigger.configuration as EmailTriggerConfiguration
  if (!configuration.emailWhitelist && !configuration.domainWhitelist) {
    return Result.nil()
  }

  if (configuration.emailWhitelist) {
    const whitelist = configuration.emailWhitelist
    if (whitelist.includes(sender)) return Result.nil()
  }

  if (configuration.domainWhitelist) {
    const whitelist = configuration.domainWhitelist
    const domain = sender.split('@')[1]
    if (!domain) return Result.nil()
    if (whitelist.includes(domain)) return Result.nil()
  }

  return Result.error(new BadRequestError('Sender is not in whitelist'))
}

export async function handleEmailTrigger(
  {
    recipient,
    senderEmail,
    senderName,
    subject,
    body,
    messageId,
    parentMessageIds,
    attachments,
  }: {
    recipient: string
    senderEmail: string
    senderName: string | undefined
    subject: string
    body: string
    messageId?: string
    parentMessageIds?: string[]
    attachments?: File[]
  },
  db = database,
): PromisedResult<undefined> {
  const [documentUuid, domain] = recipient.split('@')
  if (domain !== EMAIL_TRIGGER_DOMAIN) {
    return Result.nil()
  }

  const trigger = await findUnscopedDocumentTriggers(
    {
      documentUuid: documentUuid!,
      triggerType: DocumentTriggerType.Email,
    },
    db,
  ).then((r) => r[0])

  if (!trigger) return Result.nil()

  const assertFilterResult = await assertTriggerFilters({
    sender: senderEmail,
    trigger,
  })
  if (assertFilterResult.error) return assertFilterResult

  const name = await getTriggerName(trigger, db)
  if (name.error) return name

  const responseResult = await getEmailResponse(
    {
      documentUuid: documentUuid!,
      trigger,
      messageId,
      parentMessageIds,
      senderEmail,
      senderName,
      subject,
      body,
      attachments,
    },
    db,
  )

  const configuration = trigger.configuration as EmailTriggerConfiguration
  if (configuration.replyWithResponse === false) return Result.nil()

  const from = `${JSON.stringify(name.unwrap())} <${trigger.documentUuid}@${EMAIL_TRIGGER_DOMAIN}>`

  const references = [
    ...(parentMessageIds ?? []),
    ...(messageId ? [messageId] : []),
  ].join(' ')

  const headers = messageId
    ? {
        'In-Reply-To': messageId,
        References: references,
        // It seems like nodemailer-mailgun-transport is ignoring the "References" header.
        // Maybe some of these will work:
        'X-Mailgun-References': references,
        'h:References': references,
        'h:X-Mailgun-References': references,
      }
    : undefined

  const mailer = new DocumentTriggerMailer(responseResult, {
    to: senderEmail,
    from,
    inReplyTo: messageId,
    references,
    subject: 'Re: ' + subject,
    headers,
  })

  const sendResult = await mailer.send()
  if (sendResult.error) return sendResult
  return Result.nil()
}
