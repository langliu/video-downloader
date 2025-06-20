import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // 这里需要替换为您的实际后端API地址
    const backendApiUrl = 'https://proxy.layzz.cn/lyz/platAnalyse/'

    // 创建 URLSearchParams 对象用于 x-www-form-urlencoded 格式
    const params = new URLSearchParams()
    params.append('link', url)
    params.append('token', 'uuic-dw-e2-cd19961216')

    console.log('body', params.toString())
    const response = await fetch(backendApiUrl, {
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API Error:', error)
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
