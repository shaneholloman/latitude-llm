import '@latitude-data/env'
import { envClient as __ } from '$/envClient'

export async function GET() {
  return Response.json({ status: 'ok' })
}
