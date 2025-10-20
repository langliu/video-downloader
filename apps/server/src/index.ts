import { env } from 'cloudflare:workers'
import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { createContext } from '@video-downloader/api/context'
import { appRouter } from '@video-downloader/api/routers/index'
import { auth } from '@video-downloader/auth'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

const app = new Hono()

app.use(logger())
app.use(
  '/*',
  cors({
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : [],
  }),
)

app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

export const apiHandler = new OpenAPIHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
})

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
})

app.use('/*', async (c, next) => {
  const context = await createContext({ context: c })

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    context: context,
    prefix: '/rpc',
  })

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response)
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    context: context,
    prefix: '/api-reference',
  })

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response)
  }

  await next()
})

app.get('/', (c) => {
  return c.text('OK')
})

export default app
