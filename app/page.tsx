'use client'

import {
  Download,
  DownloadCloud,
  FolderOpen,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { UrlTooltip } from '@/components/url-tooltip'
import { VideoDownloader } from '@/lib/download'
import { storage } from '@/lib/storage'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

// 扩展 Window 接口以包含 File System Access API
declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
  }
}

interface VideoInfo {
  id: string
  name: string
  cover: string
  videoUrl: string
  success: boolean
  error?: string
}

interface ApiResponse {
  code: string
  message: string
  data: {
    playAddr: string
    cover: string
    desc: string
  }
}

interface DownloadProgress {
  id: string
  name: string
  status: 'pending' | 'downloading' | 'completed' | 'failed'
  progress: number
  error?: string
}

export default function VideoUrlProcessor() {
  const [urls, setUrls] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<VideoInfo[]>([])
  const [error, setError] = useState('')
  const [cacheAvailable, setCacheAvailable] = useState(false)
  const [lastCacheTime, setLastCacheTime] = useState<string>('')
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress[]>([])
  const [downloader, setDownloader] = useState<VideoDownloader | null>(null)
  const [singleDownloading, setSingleDownloading] = useState<Set<string>>(new Set())
  const [selectedFolder, setSelectedFolder] = useState<FileSystemDirectoryHandle | null>(null)
  const [folderName, setFolderName] = useState('')
  const [isMounted, setIsMounted] = useState(false)

  // 分割URL的函数
  const parseUrls = (input: string): string[] => {
    const list = input
      .split(/[,\n]/) // 按逗号、斜杠或换行符分割
      .map((url) => url.trim())
      .filter((url) => url.length > 0)
    return [...new Set(list)]
  }

  // 获取有效URL列表（用于显示）
  const getValidUrls = (input: string): string[] => {
    return parseUrls(input)
  }

  // 模拟API调用
  const fetchVideoInfo = async (url: string): Promise<VideoInfo> => {
    try {
      // 这里需要替换为您的实际API地址
      const apiUrl = '/api/video/info' // 或者您的实际API地址

      const response = await fetch(apiUrl, {
        body: JSON.stringify({ url }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse = await response.json()

      // 检查业务状态码
      if (result.code !== '0001') {
        throw new Error(result.message || '获取视频信息失败')
      }

      const videoId = Math.random().toString(36).substring(2, 11)
      return {
        cover: result.data.cover,
        id: videoId,
        name: result.data.desc || '未知视频',
        success: true,
        videoUrl: result.data.playAddr,
      }
    } catch (error) {
      const videoId = Math.random().toString(36).substring(2, 11)
      return {
        cover: '/placeholder.svg?height=180&width=320',
        error: error instanceof Error ? error.message : '未知错误',
        id: videoId,
        name: '获取失败',
        success: false,
        videoUrl: '',
      }
    }
  }

  useEffect(() => {
    // 设置组件已挂载
    setIsMounted(true)

    // 检查localStorage是否可用
    setCacheAvailable(storage.isAvailable())

    // 加载缓存数据
    const cachedData = storage.load()
    if (cachedData) {
      setUrls(cachedData.urls)
      setLastCacheTime(new Date(cachedData.timestamp).toLocaleString())
    }

    // 初始化下载器
    const downloaderInstance = new VideoDownloader((progress) => {
      setDownloadProgress(progress)
    })
    setDownloader(downloaderInstance)
  }, [])

  // 添加保存缓存的函数
  const saveToCache = (urlsToSave: string) => {
    if (cacheAvailable) {
      storage.save(urlsToSave)
      setLastCacheTime(new Date().toLocaleString())
    }
  }

  // 添加清除缓存的函数
  const clearCache = () => {
    storage.clear()
    setUrls('')
    setResults([])
    setLastCacheTime('')
    setError('')
  }

  // 检查浏览器是否支持 File System Access API
  const isFileSystemAccessSupported = useMemo(() => {
    if (!isMounted || typeof window === 'undefined') {
      return false
    }

    console.log(
      'isFileSystemAccessSupported',
      isMounted,
      typeof window !== 'undefined',
      'showDirectoryPicker' in window,
    )
    return 'showDirectoryPicker' in window
  }, [isMounted])

  // 选择文件夹
  const selectFolder = async () => {
    console.log('selectFolder', isFileSystemAccessSupported)
    try {
      if (!isFileSystemAccessSupported) {
        setError('您的浏览器不支持文件夹选择功能，将使用默认下载方式')
        return
      }

      const dirHandle = await window?.showDirectoryPicker?.()
      if (dirHandle) {
        setSelectedFolder(dirHandle)
        setFolderName(dirHandle.name)
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('选择文件夹失败:', error)
        setError('选择文件夹失败')
      }
    }
  }

  const handleSubmit = async () => {
    const urlList = parseUrls(urls)

    if (urlList.length === 0) {
      setError('请输入有效的URL地址')
      return
    }

    setLoading(true)
    setError('')
    setResults([])

    try {
      // 并发调用所有URL的接口
      const promises = urlList.map((url) => fetchVideoInfo(url))
      const videoInfos = await Promise.all(promises)

      // 分离成功和失败的结果
      const successCount = videoInfos.filter((v) => v.success).length
      const failCount = videoInfos.length - successCount

      setResults(videoInfos)

      // 保存到缓存
      saveToCache(urls)

      if (failCount > 0) {
        setError(`${successCount} 个成功，${failCount} 个失败`)
      }
    } catch (error) {
      console.error('获取视频信息失败:', error)
      setError('获取视频信息失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 批量下载所有视频
  const handleBatchDownload = async () => {
    const successfulVideos = results.filter((video) => video.success && video.videoUrl)

    if (successfulVideos.length === 0) {
      setError('没有可下载的视频')
      return
    }

    if (downloader) {
      // 在用户激活上下文中检查权限
      if (selectedFolder && isFileSystemAccessSupported) {
        try {
          // 立即检查权限，确保在用户激活上下文中
          const permission = await selectedFolder.queryPermission({ mode: 'readwrite' })
          if (permission !== 'granted') {
            const newPermission = await selectedFolder.requestPermission({ mode: 'readwrite' })
            if (newPermission !== 'granted') {
              console.warn('用户拒绝了文件夹权限，将使用默认下载方式')
              setError('文件夹权限被拒绝，将使用默认下载方式')
            }
          }
        } catch (error) {
          console.warn('权限检查失败，将使用默认下载方式:', error)
          setError('无法获取文件夹权限，将使用默认下载方式')
        }
      }

      // 设置下载文件夹
      downloader.setDownloadFolder(selectedFolder)

      await downloader.downloadVideos(
        successfulVideos.map((video) => ({
          id: video.id,
          name: video.name,
          videoUrl: video.videoUrl,
        })),
      )
    }
  }

  // 单个视频下载
  const handleSingleDownload = async (video: VideoInfo) => {
    if (!video.videoUrl || !downloader) return

    setSingleDownloading((prev) => new Set(prev).add(video.id))

    try {
      // 在用户激活上下文中检查权限
      if (selectedFolder && isFileSystemAccessSupported) {
        try {
          // 立即检查权限，确保在用户激活上下文中
          const permission = await selectedFolder.queryPermission({ mode: 'readwrite' })
          if (permission !== 'granted') {
            const newPermission = await selectedFolder.requestPermission({ mode: 'readwrite' })
            if (newPermission !== 'granted') {
              console.warn('用户拒绝了文件夹权限，将使用默认下载方式')
              setError('文件夹权限被拒绝，将使用默认下载方式')
            }
          }
        } catch (error) {
          console.warn('权限检查失败，将使用默认下载方式:', error)
          setError('无法获取文件夹权限，将使用默认下载方式')
        }
      }

      // 设置下载文件夹
      downloader.setDownloadFolder(selectedFolder)
      await downloader.downloadVideo(video.videoUrl, video.name, video.id)
    } finally {
      setSingleDownloading((prev) => {
        const newSet = new Set(prev)
        newSet.delete(video.id)
        return newSet
      })
    }
  }

  // 重新下载失败的视频
  const handleRetryDownload = async (video: VideoInfo) => {
    if (!video.videoUrl || !downloader) return

    try {
      // 在用户激活上下文中检查权限
      if (selectedFolder && isFileSystemAccessSupported) {
        try {
          const permission = await selectedFolder.queryPermission({ mode: 'readwrite' })
          if (permission !== 'granted') {
            const newPermission = await selectedFolder.requestPermission({ mode: 'readwrite' })
            if (newPermission !== 'granted') {
              console.warn('用户拒绝了文件夹权限，将使用默认下载方式')
              setError('文件夹权限被拒绝，将使用默认下载方式')
            }
          }
        } catch (error) {
          console.warn('权限检查失败，将使用默认下载方式:', error)
          setError('无法获取文件夹权限，将使用默认下载方式')
        }
      }

      // 设置下载文件夹
      downloader.setDownloadFolder(selectedFolder)
      await downloader.retryDownload(video.id, video.videoUrl, video.name)
    } catch (error) {
      console.error('重新下载失败:', error)
      setError('重新下载失败')
    }
  }

  const validUrlCount = parseUrls(urls).length
  const successfulVideos = results.filter((video) => video.success && video.videoUrl)

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='container mx-auto px-4 max-w-4xl'>
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>视频信息提取器</h1>
          <p className='text-gray-600'>输入多个视频URL地址，获取视频名称、封面和地址信息</p>
        </div>

        <Card className='mb-8'>
          <CardHeader>
            <CardTitle>输入视频URL</CardTitle>
            <CardDescription>支持用逗号(,)或换行符分割多个URL地址</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Textarea
                className='min-h-[120px] resize-none max-h-[200px]'
                disabled={loading}
                onChange={(e) => {
                  setUrls(e.target.value)
                  // 延迟保存输入内容到缓存
                  if (cacheAvailable) {
                    setTimeout(() => {
                      storage.save(e.target.value)
                    }, 1000) // 1秒后保存，避免频繁写入
                  }
                }}
                placeholder='请输入视频URL地址，例如：&#10;https://example.com/video1&#10;https://example.com/video2,https://example.com/video3&#10;https://example.com/video4/https://example.com/video5'
                value={urls}
              />
              <div className='flex items-center justify-between text-sm text-gray-500'>
                <UrlTooltip count={validUrlCount} urls={getValidUrls(urls)} />
                <span>{urls.length}/2000</span>
              </div>
            </div>

            {cacheAvailable && (
              <div className='flex items-center justify-between text-xs text-gray-500 bg-gray-50 p-3 rounded-md'>
                <div className='flex items-center space-x-4'>
                  <span className='flex items-center'>
                    <RefreshCw className='h-3 w-3 mr-1' />
                    缓存已启用
                  </span>
                  {lastCacheTime && <span>最后更新: {lastCacheTime}</span>}
                </div>
                <Button
                  className='h-6 px-2 text-xs hover:bg-red-50 hover:text-red-600'
                  onClick={clearCache}
                  size='sm'
                  variant='ghost'
                >
                  <Trash2 className='h-3 w-3 mr-1' />
                  清除缓存
                </Button>
              </div>
            )}

            {error && <div className='text-red-600 text-sm bg-red-50 p-3 rounded-md'>{error}</div>}

            <Button
              className='w-full'
              disabled={loading || validUrlCount === 0}
              onClick={handleSubmit}
            >
              {loading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  正在获取视频信息...
                </>
              ) : (
                `获取视频信息 (${validUrlCount} 个URL)`
              )}
            </Button>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <div className='space-y-4'>
            <div className='flex items-center justify-between mt-4'>
              <h2 className='text-2xl font-semibold text-gray-900'>
                视频信息结果 ({results.length})
              </h2>
              {successfulVideos.length > 0 && (
                <div className='flex items-center gap-2'>
                  {/* 下载位置选择按钮 */}
                  <Button
                    className={`${
                      !isFileSystemAccessSupported
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : folderName
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    disabled={
                      !isFileSystemAccessSupported ||
                      downloadProgress.some((p) => p.status === 'downloading')
                    }
                    onClick={selectFolder}
                    size='sm'
                    title={folderName ? `当前选择: ${folderName}` : '选择下载文件夹'}
                  >
                    <FolderOpen className='mr-2 h-4 w-4' />
                    {folderName ? folderName : '选择文件夹'}
                  </Button>

                  {/* 清除文件夹选择按钮 */}
                  {folderName && (
                    <Button
                      className='bg-gray-200 hover:bg-gray-300 text-gray-600'
                      disabled={downloadProgress.some((p) => p.status === 'downloading')}
                      onClick={() => {
                        setSelectedFolder(null)
                        setFolderName('')
                        setError('')
                      }}
                      size='sm'
                      title='清除文件夹选择'
                    >
                      <X className='h-4 w-4' />
                    </Button>
                  )}

                  {/* 批量下载按钮 */}
                  <Button
                    className='bg-green-600 hover:bg-green-700 text-white'
                    disabled={downloadProgress.some((p) => p.status === 'downloading')}
                    onClick={handleBatchDownload}
                  >
                    <DownloadCloud className='mr-2 h-4 w-4' />
                    批量下载 ({successfulVideos.length} 个视频)
                  </Button>
                </div>
              )}
            </div>

            {/* 下载位置提示 */}
            {successfulVideos.length > 0 && (
              <div className='bg-blue-50 border border-blue-200 rounded-md p-3 text-sm'>
                <div className='flex items-center text-blue-800'>
                  <FolderOpen className='mr-2 h-4 w-4' />
                  <span className='font-medium'>下载位置:</span>
                  <span className='ml-2'>
                    {folderName
                      ? `将保存到文件夹 "${folderName}"`
                      : isFileSystemAccessSupported
                        ? '将使用浏览器默认下载位置（可点击上方按钮选择文件夹）'
                        : '将使用浏览器默认下载位置（您的浏览器不支持文件夹选择）'}
                  </span>
                </div>
              </div>
            )}

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">封面</TableHead>
                    <TableHead>视频名称</TableHead>
                    <TableHead className="w-[120px]">状态</TableHead>
                    <TableHead className="w-[200px]">下载进度</TableHead>
                    <TableHead className="w-[200px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((video) => {
                    const downloadItem = downloadProgress.find(p => p.id === video.id)
                    const isDownloading = singleDownloading.has(video.id)

                    return (
                      <TableRow className={!video.success ? 'bg-red-50' : ''} key={video.id}>
                        <TableCell>
                          <div className="relative w-20 h-12 rounded overflow-hidden">
                            <Image
                              alt={video.name}
                              className="w-full h-full object-cover"
                              fill
                              src={video.cover || '/placeholder.svg'}
                              sizes='400'
                            />
                            {video.success && video.videoUrl && (
                              <a
                                className="absolute inset-0 hover:bg-opacity-30 flex items-center justify-center transition-all duration-200 cursor-pointer"
                                href={video.videoUrl}
                                rel="noopener noreferrer"
                                target="_blank"
                                title="播放视频"
                              >
                                <Play className="text-white h-4 w-4 opacity-0 hover:opacity-100 transition-opacity" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="font-medium text-sm line-clamp-2" title={video.name}>
                              {video.name}
                            </p>
                            {!video.success && video.error && (
                              <p className="text-xs text-red-600 mt-1">{video.error}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {!video.success ? (
                            <Badge variant="destructive">获取失败</Badge>
                          ) : downloadItem ? (
                            <Badge
                              variant={
                                downloadItem.status === 'completed' ? 'default' :
                                downloadItem.status === 'failed' ? 'destructive' :
                                downloadItem.status === 'downloading' ? 'secondary' : 'outline'
                              }
                            >
                              {downloadItem.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {downloadItem.status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
                              {downloadItem.status === 'downloading' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                              {downloadItem.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                              {downloadItem.status === 'completed' ? '已完成' :
                               downloadItem.status === 'failed' ? '下载失败' :
                               downloadItem.status === 'downloading' ? '下载中' : '等待中'}
                            </Badge>
                          ) : (
                            <Badge variant="outline">未下载</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {downloadItem && downloadItem.status === 'downloading' && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span>进度</span>
                                <span>{downloadItem.progress}%</span>
                              </div>
                              <Progress className="h-2" value={downloadItem.progress} />
                            </div>
                          )}
                          {downloadItem && downloadItem.status === 'failed' && downloadItem.error && (
                            <p className="text-xs text-red-600">{downloadItem.error}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {!video.success ? (
                              <Button disabled size="sm" variant="outline">
                                无法下载
                              </Button>
                            ) : downloadItem && downloadItem.status === 'failed' ? (
                              <Button
                                disabled={isDownloading}
                                onClick={() => handleRetryDownload(video)}
                                size="sm"
                                variant="outline"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                重试
                              </Button>
                            ) : (
                              <Button
                                disabled={isDownloading || downloadItem?.status === 'downloading'}
                                onClick={() => handleSingleDownload(video)}
                                size="sm"
                              >
                                {isDownloading || downloadItem?.status === 'downloading' ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    下载中
                                  </>
                                ) : downloadItem?.status === 'completed' ? (
                                  <>
                                    <Download className="w-3 h-3 mr-1" />
                                    重新下载
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-3 h-3 mr-1" />
                                    下载
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}


      </div>
    </div>
  )
}
