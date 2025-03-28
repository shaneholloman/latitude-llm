import { Job } from 'bullmq'

import { setupQueues } from '../..'
import { LatitudeEvent } from '../../../events/events'
import { EventHandlers } from '../../../events/handlers/index'

export const publishEventJob = async (job: Job<LatitudeEvent>) => {
  const event = job.data
  const handlers = EventHandlers[event.type]
  if (!handlers?.length) return

  const queues = await setupQueues()

  handlers.forEach((handler) => {
    queues.eventsQueue.queue.add(handler.name, event)
  })
}
