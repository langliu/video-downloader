import { DataTransferType, TosClient } from '@volcengine/tos-sdk'
import type { Job } from 'bullmq'
import {} from 'bun'

// 配置通过环境变量注入
const TOS_ACCESS_KEY = process.env['TOS_ACCESS_KEY'] || ''
const TOS_SECRET_KEY = process.env['TOS_SECRET_KEY'] || ''
const TOS_ENDPOINT = process.env['TOS_ENDPOINT'] || 'tos-cn-beijing.volces.com'
const TOS_REGION = process.env['TOS_REGION'] || 'cn-beijing'
const TOS_BUCKET = process.env['TOS_BUCKET'] || 'anhuahua'

const client = new TosClient({
  accessKeyId: TOS_ACCESS_KEY,
  accessKeySecret: TOS_SECRET_KEY,
  endpoint: TOS_ENDPOINT,
  region: TOS_REGION,
})

// Minimal local typing for putObject input to avoid depending on SDK types in this file
type PutObjectInput = {
  Bucket: string
  Key: string
  Body: Uint8Array | ArrayBuffer | unknown
}

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
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
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
    const res = await getVideoInfo(url)

    console.log('视频解析成功', job.id, res)
    // 解析成功后，如果有播放地址则抓取并上传到 TOS
    if (res?.playAddr) {
      const remoteUrl = res.playAddr
      const key = `${res.desc}.mp4`
      try {
        const r = await uploadToTOS(remoteUrl, key)
        console.log('上传到 TOS 成功', r)
      } catch (err) {
        console.error('上传到 TOS 失败', err)
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

async function uploadToTOS(remoteUrl: string, key: string) {
  if (!TOS_BUCKET) {
    throw new Error('TOS_BUCKET 未配置')
  }
  console.log('开始上传到 TOS')
  const resp = await fetch(remoteUrl)
  if (!resp.ok) {
    throw new Error(
      `fetch remote video failed: ${resp.status} ${resp.statusText}`,
    )
  }

  const ab = await resp.arrayBuffer()
  console.log('fetch remote video success', remoteUrl)
  await Bun.write(key, ab)
  try {
    client
      .putObject({
        body: Buffer.from(ab),
        bucket: TOS_BUCKET,
        dataTransferStatusChange: (event) => {
          if (event.type === DataTransferType.Started) {
            console.log('Data Transfer Started')
          } else if (event.type === DataTransferType.Rw) {
            const percent = (
              (event.consumedBytes / event.totalBytes) *
              100
            ).toFixed(2)
            console.log(
              `Once Read:${event.rwOnceBytes},ConsumerBytes/TotalBytes: ${event.consumedBytes}/${event.totalBytes},${percent}%`,
            )
          } else if (event.type === DataTransferType.Succeed) {
            const percent = (
              (event.consumedBytes / event.totalBytes) *
              100
            ).toFixed(2)
            console.log(
              `Data Transfer Succeed, ConsumerBytes/TotalBytes:${event.consumedBytes}/${event.totalBytes},${percent}%`,
            )
          } else if (event.type === DataTransferType.Failed) {
            console.log('Data Transfer Failed')
          }
        },
        key,
      })
      .then((result) => {
        console.log('上传到 TOS 成功', result)
      })

    // return result
  } catch (error) {
    console.error('上传到 TOS 失败', error)
    throw error
  }
}
