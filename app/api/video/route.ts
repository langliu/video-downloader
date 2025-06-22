import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // 获取请求体中的URL
    const body = await request.json()
    const { url } = body

    // 验证URL是否存在
    if (!url) {
      return NextResponse.json({ error: '缺少视频URL参数' }, { status: 400 })
    }

    // 验证URL格式
    let videoUrl: URL
    try {
      videoUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: '无效的URL格式' }, { status: 400 })
    }

    // 检查URL协议是否为http或https
    if (!['http:', 'https:'].includes(videoUrl.protocol)) {
      return NextResponse.json({ error: 'URL必须使用http或https协议' }, { status: 400 })
    }

    // 获取视频数据，添加超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时

    console.log('开始获取视频:', url)

    const response = await fetch(url, {
      headers: {
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    console.log('获取响应:', response.status, response.statusText)

    // 检查响应状态
    if (!response.ok) {
      return NextResponse.json(
        {
          error: `获取视频失败: ${response.status} ${response.statusText}`,
        },
        { status: response.status >= 400 && response.status < 500 ? response.status : 500 },
      )
    }

    // 检查内容类型是否为视频或其他媒体类型
    const contentType = response.headers.get('content-type') || 'application/octet-stream'

    // 支持的媒体类型
    const supportedTypes = ['video/', 'application/octet-stream', 'binary/octet-stream']
    const isValidType = supportedTypes.some((type) => contentType.toLowerCase().includes(type))

    if (!isValidType && contentType !== 'application/octet-stream') {
      console.warn(`警告: 内容类型可能不是视频文件: ${contentType}`)
      // 不阻止请求，只是警告
    }

    // 获取视频数据
    const videoBuffer = await response.arrayBuffer()

    // 设置响应头
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Content-Length', videoBuffer.byteLength.toString())

    // 如果原始响应包含文件名信息，保留它
    const contentDisposition = response.headers.get('content-disposition')
    if (contentDisposition) {
      headers.set('Content-Disposition', contentDisposition)
    }

    // 添加CORS头
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type')

    // 返回视频blob
    return new Response(videoBuffer, {
      headers,
      status: 200,
    })
  } catch (error) {
    console.error('视频处理错误:', error)

    // 处理不同类型的错误
    if (error instanceof Error) {
      console.error('错误详情:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      })

      // 超时错误
      if (error.name === 'AbortError') {
        return NextResponse.json(
          {
            details: '视频下载超时，请检查URL或稍后重试',
            error: '请求超时',
          },
          { status: 408 },
        )
      }

      // 网络连接错误
      if (error.message.includes('fetch') || error.name === 'TypeError') {
        let errorDetails = '网络请求失败'

        // 检查具体的网络错误类型
        if (error.cause) {
          const cause = error.cause as any
          if (cause.code === 'ECONNRESET') {
            errorDetails = '连接被重置，可能是网络不稳定或服务器拒绝连接'
          } else if (cause.code === 'UND_ERR_CONNECT_TIMEOUT') {
            errorDetails = '连接超时，服务器可能不可达或网络延迟过高'
          } else if (cause.code === 'ENOTFOUND') {
            errorDetails = '域名解析失败，请检查URL是否正确'
          } else if (cause.code === 'ECONNREFUSED') {
            errorDetails = '连接被拒绝，服务器可能已关闭或防火墙阻止'
          } else {
            errorDetails = `网络错误: ${cause.code || cause.message || error.message}`
          }
        }

        return NextResponse.json(
          {
            details: errorDetails,
            error: '网络请求失败',
            suggestion: '请检查网络连接、URL是否正确，或稍后重试',
          },
          { status: 502 },
        )
      }

      // DNS 解析错误
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        return NextResponse.json(
          {
            details: '域名解析失败，请检查URL是否正确',
            error: 'DNS解析失败',
            suggestion: '请确认视频URL地址是否正确',
          },
          { status: 400 },
        )
      }
    }

    return NextResponse.json(
      {
        details: error instanceof Error ? error.message : '未知错误',
        error: '服务器内部错误',
        suggestion: '请稍后重试或联系管理员',
      },
      { status: 500 },
    )
  }
}

// OPTIONS 请求处理 (CORS预检)
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Max-Age': '86400',
    },
    status: 204,
  })
}
