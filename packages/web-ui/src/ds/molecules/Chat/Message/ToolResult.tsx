import { ToolContent } from '@latitude-data/compiler'
import { CodeBlock } from '../../../atoms'
import { CardTextContent, ContentCard } from './ContentCard'
import { useMemo } from 'react'
import { LatitudeToolInternalName } from '@latitude-data/core/browser'
import { WebSearchLatitudeToolResponseContent } from './LatitudeTools/Search'
import { WebExtractLatitudeToolResponseContent } from './LatitudeTools/Extract'
import type { SearchToolResult } from '@latitude-data/core/services/latitudeTools/webSearch/types'
import type { ExtractToolResult } from '@latitude-data/core/services/latitudeTools/webExtract/types'

function getResult<S extends boolean>(
  value: unknown,
): [S extends true ? string : unknown, boolean] {
  if (typeof value !== 'string') {
    return [value, false] as [S extends true ? string : unknown, boolean]
  }

  const stringValue = value as string
  try {
    const parsedResult = JSON.parse(stringValue)
    return getResult(parsedResult)
  } catch (_) {
    // do nothing
  }

  return [stringValue, true]
}

export function ToolResultContent({ value }: { value: ToolContent }) {
  const [result, isString] = useMemo(
    () => getResult(value.result),
    [value.result],
  )

  const bgColor = value.isError ? 'bg-destructive' : 'bg-muted'
  const fgColor = value.isError ? 'destructiveForeground' : 'foregroundMuted'

  if (!value.isError && value.toolName === LatitudeToolInternalName.WebSearch) {
    return (
      <WebSearchLatitudeToolResponseContent
        toolCallId={value.toolCallId}
        response={result as SearchToolResult | string}
      />
    )
  }

  if (
    !value.isError &&
    value.toolName === LatitudeToolInternalName.WebExtract
  ) {
    return (
      <WebExtractLatitudeToolResponseContent
        toolCallId={value.toolCallId}
        response={result as ExtractToolResult}
      />
    )
  }

  return (
    <ContentCard
      label={value.toolName}
      icon='terminal'
      bgColor={bgColor}
      fgColor={fgColor}
      info={value.toolCallId}
    >
      {isString ? (
        <CardTextContent
          value={result as string}
          color={value.isError ? 'destructive' : 'foregroundMuted'}
        />
      ) : (
        <CodeBlock language='json'>
          {JSON.stringify(value.result, null, 2)}
        </CodeBlock>
      )}
    </ContentCard>
  )
}
