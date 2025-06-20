'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

// 扩展 Window 接口以包含 File System Access API
declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
  }
}

export default function VideoDownload() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<FileSystemDirectoryHandle | null>(null)
  const [folderName, setFolderName] = useState('')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 检查浏览器是否支持 File System Access API
  const isFileSystemAccessSupported = () => {
    return isMounted && typeof window !== 'undefined' && 'showDirectoryPicker' in window
  }

  // 选择文件夹
  const selectFolder = async () => {
    try {
      if (!isFileSystemAccessSupported()) {
        setStatus('您的浏览器不支持文件夹选择功能，将使用默认下载方式')
        return
      }

      const dirHandle = await window?.showDirectoryPicker?.()
      if (dirHandle) {
        setSelectedFolder(dirHandle)
        setFolderName(dirHandle.name)
        setStatus(`已选择文件夹: ${dirHandle.name}`)
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('选择文件夹失败:', error)
        setStatus('选择文件夹失败')
      }
    }
  }

  // 默认下载方法（创建下载链接）
  const downloadWithDefaultMethod = (blob: Blob, filename: string) => {
    if (typeof window === 'undefined') return

    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(downloadUrl)
  }

  const downloadVideo = async () => {
    if (!url.trim()) {
      setStatus('请输入视频地址')
      return
    }

    setIsLoading(true)
    setStatus('正在下载视频...')

    try {
      console.log('开始请求视频:', url.trim())

      const response = await fetch('/api/video', {
        body: JSON.stringify({ url: url.trim() }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      console.log('API响应状态:', response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API错误响应:', errorData)
        throw new Error(errorData.details || errorData.error || '下载失败')
      }

      // 获取文件名
      const contentDisposition = response.headers.get('content-disposition')
      let filename = 'video'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match) filename = match[1]
      } else {
        // 从URL中提取文件名
        try {
          const urlObj = new URL(url)
          const pathname = urlObj.pathname
          const lastSlash = pathname.lastIndexOf('/')
          if (lastSlash !== -1) {
            filename = pathname.substring(lastSlash + 1) || 'video'
          }
        } catch {
          filename = 'video'
        }
      }

      // 确保文件名有扩展名
      if (!filename.includes('.')) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.startsWith('video/')) {
          const ext = contentType.split('/')[1]
          filename += '.' + ext
        } else {
          filename += '.mp4'
        }
      }

      // 创建blob并下载
      const blob = await response.blob()

      // 如果选择了文件夹且浏览器支持，则保存到指定文件夹
      if (selectedFolder && isFileSystemAccessSupported()) {
        try {
          const fileHandle = await selectedFolder.getFileHandle(filename, {
            create: true,
          })
          const writable = await fileHandle.createWritable()
          await writable.write(blob)
          await writable.close()
          setStatus(`视频已保存到文件夹 "${folderName}" 中！`)
        } catch (error) {
          console.error('保存到文件夹失败:', error)
          // 如果保存到文件夹失败，回退到默认下载方式
          downloadWithDefaultMethod(blob, filename)
          setStatus('保存到指定文件夹失败，已使用默认下载方式')
        }
      } else {
        // 使用默认下载方式
        downloadWithDefaultMethod(blob, filename)
        setStatus('视频下载成功！')
      }
    } catch (error) {
      console.error('下载错误:', error)

      // 详细的错误信息
      let errorMessage = '未知错误'
      if (error instanceof Error) {
        errorMessage = error.message
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = '网络连接失败，请检查网络连接或URL是否正确'
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = '无法连接到服务器，请检查网络连接'
        }
      }

      setStatus(`下载失败: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg'>
      <h1 className='text-3xl font-bold text-gray-800 mb-6 text-center'>视频下载器</h1>
      <p className='text-gray-600 mb-6 text-center'>
        输入视频URL地址，点击下载按钮即可下载视频到本地
      </p>

      <div className='space-y-4'>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2' htmlFor='videoUrl'>
            视频地址
          </label>
          <textarea
            className='w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
            id='videoUrl'
            onChange={(e) => setUrl(e.target.value)}
            placeholder='请输入视频地址，例如：https://example.com/video.mp4'
            value={url}
          />
        </div>

        {/* 文件夹选择区域 */}
        <div className='space-y-2'>
          <label className='block text-sm font-medium text-gray-700'>
            下载位置{' '}
            {!isFileSystemAccessSupported() && (
              <span className='text-gray-500'>(浏览器不支持文件夹选择)</span>
            )}
          </label>
          <div className='flex gap-2'>
            <button
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                !isFileSystemAccessSupported() || isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500'
              }`}
              disabled={!isFileSystemAccessSupported() || isLoading}
              onClick={selectFolder}
            >
              {folderName ? `已选择: ${folderName}` : '选择下载文件夹'}
            </button>
            {folderName && (
              <button
                className='px-3 py-2 text-gray-500 hover:text-gray-700 focus:outline-none'
                disabled={isLoading}
                onClick={() => {
                  setSelectedFolder(null)
                  setFolderName('')
                  setStatus('')
                }}
                title='清除选择'
              >
                ✕
              </button>
            )}
          </div>
          {!isFileSystemAccessSupported() && (
            <p className='text-xs text-gray-500'>
              您的浏览器不支持文件夹选择功能，视频将下载到默认下载文件夹
            </p>
          )}
        </div>

        <button
          className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          }`}
          disabled={isLoading}
          onClick={downloadVideo}
        >
          {isLoading ? '下载中...' : '下载视频'}
        </button>

        {status && (
          <div
            className={`p-3 rounded-md text-sm ${
              status.includes('成功')
                ? 'bg-green-100 text-green-800 border border-green-200'
                : status.includes('失败') || status.includes('错误')
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}
          >
            {status}
          </div>
        )}
      </div>

      <div className='mt-8 text-sm text-gray-500'>
        <h3 className='font-medium mb-2'>使用说明：</h3>
        <ul className='list-disc list-inside space-y-1'>
          <li>支持大部分视频网站的直链地址</li>
          <li>URL必须是http或https协议</li>
          <li>下载超时时间为30秒</li>
          <li>支持自动识别文件名和格式</li>
          <li>可选择指定文件夹下载（需要现代浏览器支持）</li>
          <li>如果不选择文件夹，将使用浏览器默认下载位置</li>
        </ul>

        <div className='mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md'>
          <h4 className='font-medium text-blue-800 mb-2'>测试URL示例：</h4>
          <div className='space-y-2'>
            <button
              className='block text-blue-600 hover:text-blue-800 underline text-xs'
              onClick={() => setUrl('https://www.w3schools.com/html/mov_bbb.mp4')}
            >
              点击填入测试视频URL (W3Schools)
            </button>
            <button
              className='block text-blue-600 hover:text-blue-800 underline text-xs'
              onClick={() =>
                setUrl('https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4')
              }
            >
              点击填入测试视频URL (Sample Videos)
            </button>
          </div>
        </div>

        <div className='mt-4'>
          <Link className='text-blue-500 hover:underline text-sm' href='/test'>
            前往API测试页面
          </Link>
        </div>
      </div>
    </div>
  )
}
