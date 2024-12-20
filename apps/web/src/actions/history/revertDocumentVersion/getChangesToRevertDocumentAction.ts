'use server'

import {
  CommitsRepository,
  DocumentVersionsRepository,
} from '@latitude-data/core/repositories'
import { z } from 'zod'

import { withProject } from '../../procedures'
import { computeDocumentRevertChanges } from '@latitude-data/core/services/documents/computeRevertChanges'
import { DraftChange } from '../types'

export const getChangesToRevertDocumentAction = withProject
  .createServerAction()
  .input(
    z.object({
      targetDraftUuid: z.string().optional(),
      documentCommitUuid: z.string(),
      documentUuid: z.string(),
    }),
  )
  .handler(async ({ input, ctx }) => {
    const { workspace, project } = ctx
    const { targetDraftUuid, documentCommitUuid, documentUuid } = input

    const commitScope = new CommitsRepository(workspace.id)
    const headCommit = await commitScope
      .getHeadCommit(project.id)
      .then((r) => r.unwrap()!)

    const targetDraft = targetDraftUuid
      ? await commitScope
          .getCommitByUuid({ uuid: targetDraftUuid, projectId: project.id })
          .then((r) => r.unwrap())
      : headCommit

    const changedCommit = await commitScope
      .getCommitByUuid({ projectId: project.id, uuid: documentCommitUuid })
      .then((r) => r.unwrap())
    const originalCommit = await commitScope.getPreviousCommit(changedCommit)

    const docsScope = new DocumentVersionsRepository(workspace.id)

    const draftDocument = await docsScope
      .getDocumentAtCommit({
        commitUuid: targetDraft.uuid,
        documentUuid: documentUuid,
      })
      .then((r) => r.value)
    const changedDocument = await docsScope
      .getDocumentAtCommit({
        commitUuid: changedCommit.uuid,
        documentUuid: documentUuid,
      })
      .then((r) => r.value)

    const originalDocument = originalCommit
      ? await docsScope
          .getDocumentAtCommit({
            commitUuid: originalCommit.uuid,
            documentUuid: documentUuid,
          })
          .then((r) => r.value)
      : undefined

    const change = await computeDocumentRevertChanges({
      workspace: workspace,
      draft: targetDraft,
      changedDocument,
      originalDocument,
    }).then((r) => r.unwrap())

    const isCreated = change.deletedAt === null
    const isDeleted = !isCreated && change.deletedAt !== undefined

    const newDocumentPath =
      change.path ??
      draftDocument?.path ??
      changedDocument?.path ??
      originalDocument!.path

    const oldDocumentPath =
      draftDocument?.path ??
      originalDocument?.path ??
      changedDocument?.path ??
      newDocumentPath

    const previousContent =
      draftDocument?.content ??
      changedDocument?.content ??
      originalDocument?.content

    const newContent = isDeleted
      ? undefined
      : (change.content ?? previousContent)

    const oldCOntent = isCreated ? undefined : previousContent

    const draftChange: DraftChange = {
      newDocumentPath,
      oldDocumentPath,
      content: {
        oldValue: oldCOntent,
        newValue: newContent,
      },
    }

    return [draftChange]
  })
