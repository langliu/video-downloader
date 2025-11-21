import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { HonoAdapter } from '@bull-board/hono'
import { Queue, Worker } from 'bullmq'
import { desc, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import IORedis from 'ioredis'
import { db } from './db'
import { videosTable } from './db/schema/video'
import { jobProcessor } from './processor'
import { customLogger, ossClient } from './utils'

const serverAdapter = new HonoAdapter(serveStatic)
createBullBoard({
  queues: [new BullMQAdapter(new Queue('test'))],
  serverAdapter,
})
serverAdapter.setBasePath('/bull-board')
const app = new Hono()
app.use(logger(customLogger))
const CORS_ORIGIN = process.env['CORS_ORIGIN'] || 'http://localhost:3001'
app.use(
  '*',
  cors({
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    origin: CORS_ORIGIN,
  }),
)

const connection = new IORedis({ maxRetriesPerRequest: null })

app.route('/bull-board', serverAdapter.registerPlugin())
app.get('/', async (c) => {
  return c.text('Hello Hono!')
})

app.post('video-saves', async (c) => {
  const queue = new Queue('test')
  const body = await c.req.json()
  const jobOptions = {
    attempts: 3, // 最大重试次数（包括第一次尝试）
    backoff: {
      delay: 1000, // 初始延迟 1 秒
      type: 'exponential',
    },
    removeOnComplete: false, // 完成后删除作业
    removeOnFail: false, // 失败后保留作业以便查看
  }
  queue.addBulk(
    body.urls.map((url: string) => ({
      data: { url },
      name: 'video',
      opts: jobOptions,
    })),
  )
  return c.json({
    body,
  })
})

app.get('/api/videos', async (c) => {
  const page = Number.parseInt(c.req.query('page') ?? '1', 10) || 1
  const pageSize = Number.parseInt(c.req.query('pageSize') ?? '12', 10) || 12
  const p = Math.max(1, page)
  const ps = Math.min(100, Math.max(1, pageSize))
  const offset = (p - 1) * ps

  const items = await db
    .select()
    .from(videosTable)
    .orderBy(desc(videosTable.createAt))
    .limit(ps)
    .offset(offset)

  const itemsWithUrl = items.map((it) => ({
    ...it,
    signedUrl: ossClient.signatureUrl(it.ossKey, { expires: 3600 }),
  }))

  const totalRow = await db
    .select({ value: sql<string>`count(*)` })
    .from(videosTable)
  const total = Number.parseInt(totalRow[0]?.value ?? '0', 10)

  return c.json({
    items: itemsWithUrl,
    page: p,
    pageSize: ps,
    total,
    totalPages: Math.ceil(total / ps),
  })
})

const worker = new Worker('test', jobProcessor, {
  concurrency: 5,
  connection,
  // 最多重试 2 次后标记为 failed
  maxStalledCount: 3,
  stalledInterval: 30000,
})

worker.on('completed', (job) => {
  console.log(`${job?.id} has completed!`)
})

worker.on('failed', (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`)
})

const port = Number.parseInt(process.env.PORT || '3000', 10)

Bun.serve({
  fetch: app.fetch,
  port,
})

console.log(`Bun server running on http://localhost:${port}`)
