import { default as OSS } from 'ali-oss'
import type { Job } from 'bullmq'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { videosTable } from '../db/schema/video'

// 配置通过环境变量注入
const OSS_ACCESS_KEY = process.env['OSS_ACCESS_KEY'] || ''
const OSS_SECRET_KEY = process.env['OSS_SECRET_KEY'] || ''
const OSS_REGION = process.env['OSS_REGION'] || ''
const OSS_BUCKET = process.env['OSS_BUCKET'] || ''

const client = new OSS({
  accessKeyId: OSS_ACCESS_KEY,
  accessKeySecret: OSS_SECRET_KEY,
  bucket: OSS_BUCKET,
  region: OSS_REGION,
})

export type VideoInfo = {
  /** 视频地址 */
  playAddr: string
  /** 视频标题 */
  desc: string
  /** 视频封面 */
  cover: string | null
  /** 背景音乐 */
  music: number
  size: string | number
}

/**
 * 解析视频
 * @param url 视频地址
 * @returns
 */
async function getVideoInfo(url: string): Promise<VideoInfo> {
  // 这里需要替换为您的实际后端API地址
  const backendApiUrl = 'https://proxy.layzz.cn/lyz/platAnalyse/'

  // 创建 URLSearchParams 对象用于 x-www-form-urlencoded 格式
  const params = new URLSearchParams()
  params.append('link', url)
  params.append('token', 'uuic-dw-e2-cd19961216')

  const response = await fetch(backendApiUrl, {
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  })
  const data = await response.json()

  if (!response.ok || data.code !== '0001') {
    throw new Error(`解析失败：${url}`)
  }
  return data.data
}

// 定义作业处理函数
export async function jobProcessor(job: Job<{ url: string }>) {
  try {
    console.log('Processing job', job.id, job.data)
    const { url } = job.data
    const exists = await db
      .select({ id: videosTable.id })
      .from(videosTable)
      .where(eq(videosTable.link, url))
      .limit(1)

    if (exists.length > 0) {
      console.log('链接已存在，跳过', url)
      return
    }
    if (!url) {
      return
    }
    const res = await getVideoInfo(url)

    console.log('视频解析成功', job.id, res)
    // 解析成功后，如果有播放地址则抓取并上传到 OSS
    if (res?.playAddr) {
      const remoteUrl = res.playAddr
      const key = `${crypto.randomUUID()}.mp4`
      try {
        const r = await uploadToOSS(remoteUrl, key)
        console.log({
          link: url,
          name: res.desc,
          ossKey: r.name,
        })
        await db.insert(videosTable).values({
          link: url,
          name: res.desc,
          ossKey: r.name,
        })
        console.log('上传到 OSS 成功', r)
      } catch (err) {
        console.error('上传到 OSS 失败', err)
        throw err
      }
    }
  } catch (error) {
    // 记录错误详情
    console.error(`Job ${job.id} failed:`, error)
    // 抛出错误以触发重试机制
    throw error
  }
}

async function uploadToOSS(remoteUrl: string, key: string) {
  if (!OSS_BUCKET) {
    throw new Error('OSS_BUCKET 未配置')
  }
  console.log('开始上传到 OSS')
  const resp = await fetch(remoteUrl)
  if (!resp.ok) {
    throw new Error(
      `fetch remote video failed: ${resp.status} ${resp.statusText}`,
    )
  }
  const ab = await resp.arrayBuffer()

  try {
    // 使用阿里云 OSS SDK 上传文件
    const result = await client.put(key, Buffer.from(ab), {
      // 可选：设置超时时间为 60 秒
      timeout: 60 * 1000,
    })

    console.log('上传到 OSS 成功', result)
    return result
  } catch (error) {
    console.error('上传到 OSS 失败', error)
    throw error
  }
}
