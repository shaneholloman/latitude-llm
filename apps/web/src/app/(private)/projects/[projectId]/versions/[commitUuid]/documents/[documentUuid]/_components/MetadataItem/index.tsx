import { ReactNode } from 'react'

import { ProviderLogDto } from '@latitude-data/core/browser'
import { Icon, Skeleton, Text, Tooltip } from '@latitude-data/web-ui'
import { FinishReason } from 'ai'

const REASONS_FINISH: Record<FinishReason, string> = {
  stop: 'This indicates that the response ended because it reached a stopping point naturally.',
  length:
    'This means the response ended because it reached the maximum number of tokens (words or characters) allowed for the response.',
  'content-filter':
    'This means the response was cut off because it was flagged as potentially inappropriate, harmful, or sensitive based on AI provider content policies.',
  'tool-calls': 'Model triggered tool calls',
  error:
    ' This indicates that the model was unable to complete the response due to a technical issue or an unexpected problem. It could happen because of internal failures, server issues, or other unforeseen errors during the generation process on the AI provider servers.',
  other:
    'Model finish without a specific reason. This could be due to a variety of reasons, such as a timeout, a server issue, or a problem with the input data.',
  unknown: 'The model has not transmited a finish reason.',
}
const ERROR_FINISH_REASON: FinishReason[] = [
  'error',
  'other',
  'unknown',
  'content-filter',
  'length',
]

type MetadataItemProps = {
  stacked?: boolean
  label: string
  value?: string
  loading?: boolean
  children?: ReactNode
}

export function MetadataItem({
  label,
  stacked = false,
  value,
  loading,
  children,
}: MetadataItemProps) {
  const className = stacked
    ? 'flex-flex-col gap-2'
    : 'flex flex-row justify-between items-center gap-2'
  return (
    <div className={className}>
      <Text.H5M color='foreground'>{label}</Text.H5M>
      <div>
        {loading ? (
          <Skeleton height='h4' className='w-12' />
        ) : (
          <>
            {value && (
              <Text.H5 align='right' color='foregroundMuted'>
                {value}
              </Text.H5>
            )}
            {children}
          </>
        )}
      </div>
    </div>
  )
}

type MetadataItemWithTooltipProps = MetadataItemProps & {
  trigger: ReactNode
  tooltipContent: string | ReactNode
}

export function MetadataItemTooltip({
  tooltipContent,
  trigger,
  ...rest
}: MetadataItemWithTooltipProps) {
  return (
    <MetadataItem {...rest}>
      <Tooltip
        side='top'
        align='end'
        delayDuration={250}
        trigger={
          <div className='flex flex-row items-center gap-x-1'>
            {trigger}
            <Icon name='info' className='text-muted-foreground' />
          </div>
        }
      >
        <div className='flex flex-col justify-between'>
          {typeof tooltipContent === 'string' ? (
            <Text.H6>{tooltipContent}</Text.H6>
          ) : (
            tooltipContent
          )}
        </div>
      </Tooltip>
    </MetadataItem>
  )
}

export function FinishReasonItem({
  providerLog,
}: {
  providerLog: ProviderLogDto
}) {
  const finishReason = providerLog.finishReason as FinishReason
  const color = ERROR_FINISH_REASON.includes(finishReason)
    ? 'destructiveMutedForeground'
    : 'foregroundMuted'
  return (
    <MetadataItemTooltip
      label='Finish reason'
      loading={!providerLog}
      trigger={<Text.H5 color={color}>{finishReason}</Text.H5>}
      tooltipContent={REASONS_FINISH[finishReason] ?? 'Unknown reason'}
    />
  )
}