import { Job } from 'bullmq'
import { eq } from 'drizzle-orm'

import { database } from '../../../client'
import { webhooks } from '../../../schema/models/webhooks'
import { events } from '../../../schema/models/events'
import {
  createWebhookDelivery,
  sendSignedWebhook,
} from '../../../services/webhooks'
import { type WebhookPayload } from '../../../services/webhooks/types'
import { Events, LatitudeEvent } from '../../../events/events'

const WEBHOOK_EVENTS: Array<Events> = ['commitPublished']

export type ProcessIndividualWebhookJobData = {
  event: typeof events.$inferSelect
  webhookId: number
}

export const processIndividualWebhookJob = async (
  job: Job<ProcessIndividualWebhookJobData>,
) => {
  const { event, webhookId } = job.data

  // Get the webhook and event
  const [webhook] = await database
    .select()
    .from(webhooks)
    .where(eq(webhooks.id, webhookId))

  if (!webhook || !webhook.isActive) {
    throw new Error(`Webhook not found or inactive: ${webhookId}`)
  }

  // Extract projectId from the event
  const projectId = fetchProjectIdFromEvent(event as LatitudeEvent)
  if (!projectId) {
    throw new Error(`No project id found in event ${event.type}`)
  }

  // Check if the webhook has project filters and if the event's projectId matches
  if (
    webhook.projectIds &&
    webhook.projectIds.length > 0 &&
    !webhook.projectIds.includes(projectId)
  ) {
    // Skip this webhook as it doesn't match the project filter
    return
  }

  // Create webhook payload
  const payload: WebhookPayload = {
    eventType: event.type,
    payload: event.data,
  }

  try {
    // Send signed webhook
    const result = await sendSignedWebhook({
      url: webhook.url,
      secret: webhook.secret,
      payload,
    })

    if (!result.ok) {
      throw result.error
    }

    const response = result.value
    if (!response) {
      throw new Error('No response received from webhook')
    }

    // Create delivery record
    await createWebhookDelivery({
      webhookId: webhook.id,
      eventType: event.type as Events,
      status: response.success ? 'success' : 'failed',
      responseStatus: response.statusCode,
      responseBody: response.responseBody,
      errorMessage: response.error?.message,
    })
  } catch (error) {
    // Create failed delivery record
    await createWebhookDelivery({
      webhookId: webhook.id,
      eventType: event.type as Events,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

function fetchProjectIdFromEvent(event: LatitudeEvent) {
  if (!WEBHOOK_EVENTS.includes(event.type as Events)) {
    return
  }

  switch (event.type) {
    case 'commitPublished':
      return event.data.commit.projectId
    default:
      return
  }
}
