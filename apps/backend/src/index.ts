import { Queue, Worker } from 'bullmq'
import { redis } from 'bun'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import IORedis from 'ioredis'
import { jobProcessor } from './processor'

const app = new Hono()
app.use(logger())

const connection = new IORedis({ maxRetriesPerRequest: null })

app.get('/', async (c) => {
  await redis.set('key', 'value33')
  return c.text('Hello Hono!')
})

app.post('video-saves', async (c) => {
  const queue = new Queue('test')
  const body = await c.req.json()
  const jobOptions = {
    attempts: 5, // 最大重试次数（包括第一次尝试）
    backoff: {
      delay: 1000, // 初始延迟 1 秒
      type: 'exponential',
    },
    removeOnComplete: true, // 完成后删除作业
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

const worker = new Worker('test', jobProcessor, { connection })

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
