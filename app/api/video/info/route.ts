import { type NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'

const VideoInfoSchema = z.object({
  links: z.array(z.string()).min(1, 'Links array cannot be empty'),
})

async function getVideoInfo(url: string) {
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

  if (!response.ok) {
    throw new Error(`Backend API error for link ${url}: ${response.status}`)
  }

  return response.json()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = VideoInfoSchema.parse(body)
    const { links } = validatedData

    // 使用 Promise.allSettled 获取所有成功的解析结果
    const results = await Promise.allSettled(links.map((link) => getVideoInfo(link)))

    // 过滤出成功的解析结果
    const successfulResults = results
      .filter((result) => result.status === 'fulfilled' && result.value.code === '0001')
      .map((result) => (result as PromiseFulfilledResult<any>).value.data)

    // 返回成功的结果，以及统计信息
    return NextResponse.json({
      data: successfulResults.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        name: item.desc,
        videoUrl: item.playAddr,
      })),
      failureCount: links.length - successfulResults.length,
      successCount: successfulResults.length,
      totalCount: links.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          code: '9999',
          details: error.issues,
          message: '参数错误',
        },
        { status: 400 },
      )
    }
    return NextResponse.json(
      {
        code: '9999',
        data: null,
        message: error instanceof Error ? error.message : '服务器内部错误',
      },
      { status: 500 },
    )
  }
}
