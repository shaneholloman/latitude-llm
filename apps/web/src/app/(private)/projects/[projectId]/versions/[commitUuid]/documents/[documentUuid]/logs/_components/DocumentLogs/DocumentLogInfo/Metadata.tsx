import { useMemo } from 'react'

import { RunErrorMessage } from '$/app/(private)/projects/[projectId]/versions/[commitUuid]/_components/RunErrorMessage'
import { formatCostInMillicents, formatDuration } from '$/app/_lib/formatUtils'
import { Inputs } from '$/hooks/useDocumentParameters'
import useProviderApiKeys from '$/stores/providerApiKeys'
import { MessageRole, ToolCall } from '@latitude-data/compiler'
import { ProviderLogDto } from '@latitude-data/core/browser'
import { DocumentLogWithMetadataAndError } from '@latitude-data/core/repositories'
import { ClickToCopy, Message, Text } from '@latitude-data/web-ui'
import { format } from 'date-fns'

import {
  FinishReasonItem,
  MetadataItem,
  MetadataItemTooltip,
} from '../../../../../[documentUuid]/_components/MetadataItem'
import { InputParams } from '../../../../_components/DocumentEditor/Editor/Playground/DocumentParams/Input/index'

function ProviderLogsMetadata({
  providerLog,
  documentLog,
  providerLogs,
}: {
  providerLog: ProviderLogDto
  documentLog: DocumentLogWithMetadataAndError
  providerLogs: ProviderLogDto[]
}) {
  const { data: providers, isLoading: providersLoading } = useProviderApiKeys()
  const tokensByModel = useMemo(() => {
    return (
      providerLogs?.reduce(
        (acc, log) => {
          if (!log.model) return acc

          acc[log.model!] = (acc[log.model!] ?? 0) + (log.tokens ?? 0)
          return acc
        },
        {} as Record<string, number>,
      ) ?? {}
    )
  }, [providerLogs])

  const costByModel = useMemo(
    () =>
      providerLogs?.reduce(
        (acc, log) => {
          const key = String(log.providerId)
          acc[key] = (acc[key] ?? 0) + log.costInMillicents
          return acc
        },
        {} as Record<string, number>,
      ) ?? {},
    [providerLogs],
  )
  const duration = useMemo(() => {
    const timeInMs = (documentLog.duration ?? 0) - (providerLog.duration ?? 0)
    if (timeInMs <= 0) return

    return formatDuration(timeInMs)
  }, [documentLog.duration, providerLog.duration])

  return (
    <>
      <MetadataItem
        label='Timestamp'
        value={format(documentLog.createdAt, 'PPp')}
      />
      <FinishReasonItem providerLog={providerLog} />
      {Object.keys(tokensByModel).length > 0 ? (
        <MetadataItemTooltip
          label='Tokens'
          loading={providersLoading}
          trigger={
            <Text.H5 color='foregroundMuted'>
              {documentLog.tokens ?? '-'}
            </Text.H5>
          }
          tooltipContent={
            <div className='flex flex-col justify-between'>
              {Object.entries(tokensByModel).map(([model, tokens]) => (
                <div
                  key={model}
                  className='flex flex-row w-full justify-between items-center gap-4'
                >
                  {model && (
                    <Text.H6B color='foregroundMuted'>{model}</Text.H6B>
                  )}
                  {tokens && (
                    <Text.H6 color='foregroundMuted'>{tokens}</Text.H6>
                  )}
                </div>
              ))}
              {Object.values(tokensByModel).some((t) => t === 0) && (
                <div className='pt-4'>
                  <Text.H6 color='foregroundMuted'>
                    Note: Number of tokens is provided by your LLM Provider.
                    Some providers may return 0 tokens.
                  </Text.H6>
                </div>
              )}
            </div>
          }
        />
      ) : (
        <MetadataItem
          label='Tokens'
          value={documentLog.tokens ? String(documentLog.tokens) : '-'}
        />
      )}
      {documentLog.costInMillicents ? (
        <MetadataItemTooltip
          loading={providersLoading}
          label='Cost'
          trigger={
            <Text.H5 color='foregroundMuted'>
              {formatCostInMillicents(documentLog.costInMillicents ?? 0)}
            </Text.H5>
          }
          tooltipContent={
            <div className='flex flex-col justify-between'>
              {Object.entries(costByModel).map(
                ([providerId, cost_in_millicents]) => (
                  <div
                    key={providerId}
                    className='flex flex-row w-full justify-between items-center gap-4'
                  >
                    <Text.H6B color='foregroundMuted'>
                      {providers?.find((p) => p.id === Number(providerId))
                        ?.name ?? 'Unknown'}
                    </Text.H6B>
                    <Text.H6 color='foregroundMuted'>
                      {formatCostInMillicents(cost_in_millicents)}
                    </Text.H6>
                  </div>
                ),
              )}
              <div className='pt-4'>
                <Text.H6 color='foregroundMuted'>
                  Note: This is just an estimate based on the token usage and
                  your provider's pricing. Actual cost may vary.
                </Text.H6>
              </div>
            </div>
          }
        />
      ) : (
        <MetadataItem label='Cost' value='-' />
      )}
      {duration && (
        <MetadataItem
          label='Time until last message'
          value={duration}
          loading={providersLoading}
        />
      )}
    </>
  )
}

function DocumentLogParameters({
  documentLog,
}: {
  documentLog: DocumentLogWithMetadataAndError
}) {
  const parameters = useMemo(() => {
    return Object.entries(documentLog.parameters).reduce(
      (acc, [key, value]) => {
        acc[key] = {
          value: String(value),
          metadata: { includeInPrompt: true },
        }
        return acc
      },
      {} as Inputs<'manual'>,
    )
  }, [documentLog.uuid, documentLog.parameters])

  return (
    <>
      <Text.H5M color='foreground'>Parameters</Text.H5M>
      <InputParams inputs={parameters} disabled />
    </>
  )
}

export function DocumentLogMetadata({
  documentLog,
  providerLogs = [],
  lastResponse,
}: {
  documentLog: DocumentLogWithMetadataAndError
  lastResponse: {
    role: MessageRole
    content: string
    toolCalls: ToolCall[]
  } | null
  providerLogs?: ProviderLogDto[]
}) {
  const providerLog = providerLogs[providerLogs.length - 1]
  return (
    <div className='flex flex-col gap-4'>
      <RunErrorMessage error={documentLog.error} />
      <MetadataItem label='Log uuid'>
        <ClickToCopy copyValue={documentLog.uuid}>
          <Text.H5 align='right' color='foregroundMuted'>
            {documentLog.uuid.split('-')[0]}
          </Text.H5>
        </ClickToCopy>
      </MetadataItem>
      <MetadataItem label='Version'>
        <ClickToCopy copyValue={documentLog.commit.uuid}>
          <Text.H5 align='right' color='foregroundMuted'>
            {documentLog.commit.uuid.split('-')[0]}
          </Text.H5>
        </ClickToCopy>
      </MetadataItem>
      <MetadataItem
        label='Duration'
        value={formatDuration(documentLog.duration)}
      />
      {providerLog ? (
        <ProviderLogsMetadata
          providerLog={providerLog}
          providerLogs={providerLogs}
          documentLog={documentLog}
        />
      ) : null}
      {Object.keys(documentLog.parameters).length > 0 && (
        <DocumentLogParameters documentLog={documentLog} />
      )}
      {lastResponse ? (
        <div className='flex flex-col gap-y-2'>
          <Text.H5M color='foreground'>Last Response</Text.H5M>
          <Message role={lastResponse.role} content={lastResponse.content} />
        </div>
      ) : null}
    </div>
  )
}
