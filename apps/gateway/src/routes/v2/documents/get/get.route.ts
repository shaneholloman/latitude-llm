import http from '$/common/http'
import { GENERIC_ERROR_RESPONSES } from '$/openApi/responses/errorResponses'
import { documentPresenterSchema } from '$/presenters/documentPresenter'
import { ROUTES } from '$/routes'
import { documentParamsSchema } from '$/routes/v2/documents/paramsSchema'
import { createRoute, z } from '@hono/zod-openapi'

function getRouteFactory({ path, tags }: { path: string; tags: string[] }) {
  return createRoute({
    operationId: 'getDocument',
    method: http.Methods.GET,
    path,
    tags,
    request: {
      params: documentParamsSchema.extend({
        documentPath: z.string().openapi({
          description: 'Prompt path',
        }),
      }),
    },
    responses: {
      ...GENERIC_ERROR_RESPONSES,
      [http.Status.OK]: {
        description: 'The document was created or retrieved successfully',
        content: {
          [http.MediaTypes.JSON]: { schema: documentPresenterSchema },
        },
      },
    },
  })
}

export const getRouteV1 = getRouteFactory({
  path: ROUTES.v1.documents.get,
  tags: ['V1_DEPRECATED'],
})
export const getRouteV2 = getRouteFactory({
  path: ROUTES.v2.documents.get,
  tags: ['Documents'],
})

export type GetRoute = typeof getRouteV2