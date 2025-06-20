'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function TestPage() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const testAPI = async () => {
    setLoading(true)
    setResult('测试中...')
    
    try {
      const response = await fetch('/api/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          url: 'https://www.w3schools.com/html/mov_bbb.mp4' 
        })
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', [...response.headers.entries()])

      if (!response.ok) {
        const errorData = await response.json()
        setResult(`错误: ${JSON.stringify(errorData, null, 2)}`)
        return
      }

      const blob = await response.blob()
      setResult(`成功! 文件大小: ${blob.size} bytes, 类型: ${blob.type}`)
      
      // 创建下载链接
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'test-video.mp4'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Test error:', error)
      setResult(`异常: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">API测试页面</h1>
      
      <button
        onClick={testAPI}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? '测试中...' : '测试API'}
      </button>
      
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">结果:</h2>
        <pre className="whitespace-pre-wrap text-sm">{result}</pre>
      </div>
      
      <div className="mt-4">
        <Link href="/" className="text-blue-500 hover:underline">返回主页</Link>
      </div>
    </div>
  )
}
