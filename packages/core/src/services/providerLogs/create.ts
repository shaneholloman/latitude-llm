import { Message, ToolCall } from '@latitude-data/compiler'
import {
  database,
  estimateCost,
  providerLogs,
  Result,
  touchApiKey,
  Transaction,
} from '@latitude-data/core'
import { LogSources, ProviderLog, Providers } from '$core/browser'
import { CompletionTokenUsage } from 'ai'

import { touchProviderApiKey } from '../providerApiKeys/touch'

export type CreateProviderLogProps = {
  uuid: string
  providerId: number
  providerType: Providers
  model: string
  config: Record<string, unknown>
  messages: Message[]
  responseText: string
  toolCalls?: ToolCall[]
  usage: CompletionTokenUsage
  duration: number
  source: LogSources
  apiKeyId?: number
  documentLogUuid?: string
}

export async function createProviderLog(
  {
    uuid,
    providerId,
    providerType,
    model,
    config,
    messages,
    responseText,
    toolCalls,
    usage,
    duration,
    source,
    apiKeyId,
    documentLogUuid,
  }: CreateProviderLogProps,
  db = database,
) {
  return await Transaction.call<ProviderLog>(async (trx) => {
    const cost = estimateCost({ provider: providerType, model, usage })

    const inserts = await trx
      .insert(providerLogs)
      .values({
        uuid,
        documentLogUuid,
        providerId,
        model,
        config,
        messages,
        responseText,
        toolCalls,
        tokens: usage.totalTokens ?? 0,
        cost_in_millicents: Math.floor(cost * 100_000),
        duration,
        source,
        apiKeyId,
      })
      .returning()

    const log = inserts[0]!
    await touchProviderApiKey(providerId, trx)
    if (apiKeyId) await touchApiKey(apiKeyId, trx)

    return Result.ok(log)
  }, db)
}
