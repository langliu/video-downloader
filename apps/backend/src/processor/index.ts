import type { PutObjectResult } from 'ali-oss'
import type { Job } from 'bullmq'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { videosTable } from '../db/schema/video'
import { customLogger, ossClient } from '../utils'

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
  customLogger('开始解析视频:', url)
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
    customLogger('视频解析失败:', url, data)
    throw new Error(`解析失败：${url}`)
  }
  customLogger('视频解析成功:', url)
  return data.data
}

// 定义作业处理函数
export async function jobProcessor(job: Job<{ url: string }>) {
  try {
    customLogger('开始处理任务', job.id, job.data)
    const { url } = job.data
    const exists = await db
      .select({ id: videosTable.id })
      .from(videosTable)
      .where(eq(videosTable.link, url))
      .limit(1)

    if (exists.length > 0) {
      customLogger('链接已存在，跳过', url)
      return
    }
    if (!url) {
      customLogger('URL为空，跳过处理')
      return
    }
    const res = await getVideoInfo(url)

    customLogger('视频解析成功', job.id, res)
    // 解析成功后，如果有播放地址则抓取并上传到 OSS
    if (res?.playAddr) {
      const remoteUrl = res.playAddr
      const key = `${crypto.randomUUID()}.mp4`
      try {
        const r: PutObjectResult = await uploadToOSS(remoteUrl, key)
        customLogger('视频信息', {
          link: url,
          name: res.desc,
          ossKey: r.name,
        })
        await db.insert(videosTable).values({
          link: url,
          name: res.desc,
          ossKey: r.name,
        })
        customLogger('上传到 OSS 成功', r)
      } catch (err) {
        customLogger('上传到 OSS 失败', err)
        throw err
      }
    }
  } catch (error) {
    // 记录错误详情
    customLogger(`Job ${job.id} failed:`, error)
    // 抛出错误以触发重试机制
    throw error
  }
}

async function uploadToOSS(
  remoteUrl: string,
  key: string,
): Promise<PutObjectResult> {
  const OSS_BUCKET = process.env['OSS_BUCKET'] || ''
  if (!OSS_BUCKET) {
    throw new Error('OSS_BUCKET 未配置')
  }
  customLogger('开始上传到 OSS:', key)

  // 为下载远程视频文件添加超时控制
  const downloadController = new AbortController()
  const downloadTimeout = setTimeout(() => {
    downloadController.abort()
    customLogger('下载远程视频文件超时')
  }, 60000) // 30秒下载超时

  try {
    const resp = await fetch(remoteUrl, {
      signal: downloadController.signal,
    })
    clearTimeout(downloadTimeout)

    if (!resp.ok) {
      throw new Error(
        `fetch remote video failed: ${resp.status} ${resp.statusText}`,
      )
    }
    const ab = await resp.arrayBuffer()
    customLogger(`下载完成，文件大小: ${ab.byteLength} 字节`)

    // 为上传到 OSS 添加超时控制
    const uploadController = new AbortController()
    const uploadTimeout = setTimeout(() => {
      uploadController.abort()
      customLogger('上传到 OSS 超时')
    }, 60000) // 60秒上传超时

    try {
      // 使用阿里云 OSS SDK 上传文件
      // 注意：阿里云 OSS SDK 可能不支持 AbortController，所以我们使用 Promise.race 来实现超时控制
      const uploadPromise = ossClient.put(key, Buffer.from(ab))
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('上传到 OSS 超时')), 60000)
      })

      const result = (await Promise.race([
        uploadPromise,
        timeoutPromise,
      ])) as PutObjectResult
      clearTimeout(uploadTimeout)

      customLogger('上传到 OSS 成功', result)
      return result
    } catch (error) {
      clearTimeout(uploadTimeout)
      customLogger('上传到 OSS 失败', error)
      throw error
    }
  } catch (error) {
    clearTimeout(downloadTimeout)
    customLogger('下载远程视频文件失败', error)
    throw error
  }
}
