import { Message, ToolCall, ToolMessage } from '@latitude-data/compiler'
import { StreamEventTypes } from '@latitude-data/constants'
import {
  ChainEvent,
  ChainEventTypes,
  OmittedLatitudeEventData,
} from '@latitude-data/constants'
import { ExecuteStepArgs, streamAIResponse } from './step/streamAIResponse'
import {
  ChainStepResponse,
  LatitudeToolCall,
  StreamType,
} from '../../constants'
import { buildMessagesFromResponse } from '../../helpers'
import { FinishReason, LanguageModelUsage } from 'ai'
import { ChainError } from './ChainErrors'
import { RunErrorCodes } from '@latitude-data/constants/errors'
import { Result } from '../Result'
import { executeLatitudeToolCall } from '../../services/latitudeTools'
import { buildToolMessage } from '../../services/latitudeTools/helpers'

const usePromise = <T>(): readonly [Promise<T>, (value: T) => void] => {
  let resolveValue: (value: T) => void

  const promisedValue = new Promise<T>((res) => {
    let isResolved = false
    resolveValue = (value) => {
      if (isResolved) return
      isResolved = true
      res(value)
    }
  })

  return [promisedValue, resolveValue!] as const
}

export class ChainStreamManager {
  private finished = false
  private inStep = false

  private tokenUsage: LanguageModelUsage
  private messages: Message[]
  private lastResponse?: ChainStepResponse<StreamType>
  private errorableUuid: string

  private resolveMessages?: (messages: Message[]) => void
  private resolveToolCalls?: (toolCalls: ToolCall[]) => void
  private resolveError?: (error: ChainError<RunErrorCodes> | undefined) => void
  private resolveLastResponse?: (
    response: ChainStepResponse<StreamType> | undefined,
  ) => void
  private controller?: ReadableStreamDefaultController<ChainEvent>
  private finishReason?: FinishReason

  constructor({
    errorableUuid,
    messages = [],
    tokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
  }: {
    errorableUuid: string
    messages?: Message[]
    tokenUsage?: LanguageModelUsage
  }) {
    this.messages = messages
    this.tokenUsage = tokenUsage
    this.errorableUuid = errorableUuid
  }

  /**
   * Starts the chain stream
   * @returns The stream, and a promise that resolves to the messages when the chain is done
   */
  start(cb?: () => Promise<void>): {
    stream: ReadableStream<ChainEvent>
    messages: Promise<Message[]>
    toolCalls: Promise<ToolCall[]>
    error: Promise<ChainError<RunErrorCodes> | undefined>
    lastResponse: Promise<ChainStepResponse<StreamType> | undefined>
  } {
    if (this.controller) throw new Error('Chain already started')
    if (this.finished) throw new Error('Chain already finished')

    const [messages, resolveMessages] = usePromise<Message[]>()
    const [error, resolveError] = usePromise<
      ChainError<RunErrorCodes> | undefined
    >()
    const [toolCalls, resolveToolCalls] = usePromise<ToolCall[]>()
    const [lastResponse, resolveLastResponse] = usePromise<
      ChainStepResponse<StreamType> | undefined
    >()
    this.resolveMessages = resolveMessages
    this.resolveError = resolveError
    this.resolveToolCalls = resolveToolCalls
    this.resolveLastResponse = resolveLastResponse

    const stream = new ReadableStream<ChainEvent>({
      start: (controller) => {
        this.controller = controller
        this.sendEvent({ type: ChainEventTypes.ChainStarted })

        cb?.()
          .then(() => !this.finished && this.done())
          .catch((error) => this.error(error))
      },
    })

    return {
      stream,
      messages,
      toolCalls,
      error,
      lastResponse,
    }
  }

  /**
   * Generates the provider response, or fetches it from cache.
   *
   * Sends both StepStarted and StepCompleted events.
   */
  async getProviderResponse(args: Omit<ExecuteStepArgs, 'controller'>) {
    if (!this.controller) throw new Error('Stream not started')

    // TODO: This may conflict with isolated steps
    this.messages = [...args.conversation.messages]

    if (this.inStep) this.completeStep()
    this.startStep()

    this.sendEvent({
      type: ChainEventTypes.ProviderStarted,
      config: args.conversation.config,
    })

    const { response, tokenUsage } = await streamAIResponse({
      controller: this.controller,
      ...args,
    })
    this.addMessageFromResponse(response)

    this.finishReason = response.finishReason
    this.tokenUsage = {
      promptTokens: this.tokenUsage.promptTokens + tokenUsage.promptTokens,
      completionTokens:
        this.tokenUsage.completionTokens + tokenUsage.completionTokens,
      totalTokens: this.tokenUsage.totalTokens + tokenUsage.totalTokens,
    }
    this.lastResponse = response

    this.sendEvent({
      type: ChainEventTypes.ProviderCompleted,
      providerLogUuid: response.providerLog!.uuid,
      tokenUsage,
      finishReason: response.finishReason ?? 'stop',
      response,
    })

    return response
  }

  /**
   * Generates the built-in tool responses.
   *
   * Sends both ToolsStarted and ToolCompleted events.
   */
  async executeLatitudeTools(
    toolCalls: LatitudeToolCall[],
  ): Promise<ToolMessage[]> {
    if (!toolCalls.length) return []
    if (!this.inStep) this.startStep()

    this.sendEvent({
      type: ChainEventTypes.ToolsStarted,
      tools: toolCalls,
    })

    const toolResponses = await Promise.all(
      toolCalls.map(async (toolCall) => {
        let toolMessage: ToolMessage
        try {
          const result = await executeLatitudeToolCall(toolCall)
          toolMessage = buildToolMessage({
            toolName: toolCall.name,
            toolId: toolCall.id,
            result: result,
          })
        } catch (error) {
          toolMessage = buildToolMessage({
            toolName: toolCall.name,
            toolId: toolCall.id,
            result: Result.error(error as Error),
          })
        }

        this.messages.push(toolMessage)
        this.sendEvent({ type: ChainEventTypes.ToolCompleted })
        return toolMessage
      }),
    )

    return toolResponses
  }

  startStep() {
    if (!this.controller) throw new Error('Stream not started')
    if (this.inStep)
      throw new Error(
        'Tried to start a new step without completing the previous one',
      )

    this.inStep = true
    this.sendEvent({
      type: ChainEventTypes.StepStarted,
    })
  }

  completeStep() {
    if (!this.controller) throw new Error('Stream not started')
    if (!this.inStep)
      throw new Error('Tried to complete step without starting it')

    this.inStep = false
    this.sendEvent({
      type: ChainEventTypes.StepCompleted,
    })
  }

  /**
   * Ends the chain stream successfully
   */
  done() {
    if (this.finished) throw new Error('Chain already finished')
    if (this.inStep) this.completeStep()
    this.sendEvent({
      type: ChainEventTypes.ChainCompleted,
      finishReason: this.finishReason ?? 'stop',
      tokenUsage: this.tokenUsage,
    })
    this.endStream()
  }

  /**
   * Ends the chain stream to request tools from the user
   */
  requestTools(tools: ToolCall[]) {
    if (this.finished) throw new Error('Chain already finished')
    this.sendEvent({
      type: ChainEventTypes.ToolsRequested,
      tools,
    })
    this.resolveToolCalls?.(tools)
    this.endStream()
  }

  /**
   * Ends the chain stream with an error
   */
  error(error: ChainError<RunErrorCodes>) {
    if (this.finished) throw new Error('Chain already finished')

    this.sendEvent({
      type: ChainEventTypes.ChainError,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    })

    this.resolveError?.(error)
    this.endStream()
  }

  forwardEvent(event: ChainEvent) {
    if (!this.controller) throw new Error('Stream not started')
    if (event.event === StreamEventTypes.Provider) {
      this.controller.enqueue(event)
      return
    }

    if (event.data.uuid !== this.errorableUuid) {
      throw new Error('Forwarded event has different errorableUuid')
    }

    this.messages = event.data.messages
    this.sendEvent(event.data)
  }

  private addMessageFromResponse(response: ChainStepResponse<StreamType>) {
    this.messages.push(...buildMessagesFromResponse({ response }))
  }

  private sendEvent(event: OmittedLatitudeEventData) {
    if (!this.controller) throw new Error('Stream not started')

    this.controller.enqueue({
      event: StreamEventTypes.Latitude,
      data: {
        ...event,
        messages: this.messages,
        uuid: this.errorableUuid,
      },
    })
  }

  private endStream() {
    if (!this.controller) throw new Error('Stream not started')
    if (this.finished) throw new Error('Chain already finished')
    this.finished = true

    this.controller.close()
    this.resolveMessages?.(this.messages)
    this.resolveLastResponse?.(this.lastResponse)
    this.resolveError?.(undefined)
    this.resolveToolCalls?.([])
  }
}

export { convertToLegacyChainStream } from './legacyStreamConverter'
