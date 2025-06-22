// 扩展 FileSystemDirectoryHandle 接口以包含权限方法
declare global {
  interface FileSystemDirectoryHandle {
    queryPermission(descriptor: {
      mode: 'read' | 'readwrite'
    }): Promise<'granted' | 'denied' | 'prompt'>
    requestPermission(descriptor: { mode: 'read' | 'readwrite' }): Promise<'granted' | 'denied'>
  }
}

interface DownloadProgress {
  id: string
  name: string
  status: 'pending' | 'downloading' | 'completed' | 'failed'
  progress: number
  error?: string
}

export class VideoDownloader {
  private downloadQueue: DownloadProgress[] = []
  private onProgressUpdate?: (progress: DownloadProgress[]) => void
  private selectedFolder: FileSystemDirectoryHandle | null = null

  constructor(onProgressUpdate?: (progress: DownloadProgress[]) => void) {
    this.onProgressUpdate = onProgressUpdate
  }

  // 设置下载文件夹
  setDownloadFolder(folder: FileSystemDirectoryHandle | null) {
    this.selectedFolder = folder
  }

  // 检查浏览器是否支持 File System Access API
  private isFileSystemAccessSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window
  }

  // 默认下载方法（创建下载链接）
  private downloadWithDefaultMethod(blob: Blob, filename: string) {
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

  // 检查并请求文件夹权限
  private async checkFolderPermission(folder: FileSystemDirectoryHandle): Promise<boolean> {
    try {
      // 检查当前权限
      const permission = await folder.queryPermission({ mode: 'readwrite' })

      if (permission === 'granted') {
        return true
      }

      // 如果没有权限，尝试请求权限
      const newPermission = await folder.requestPermission({ mode: 'readwrite' })
      return newPermission === 'granted'
    } catch (error) {
      console.error('权限检查失败:', error)
      return false
    }
  }

  // 保存文件到指定文件夹
  private async saveToFolder(blob: Blob, filename: string): Promise<boolean> {
    if (!this.selectedFolder) return false

    try {
      // 检查权限
      const hasPermission = await this.checkFolderPermission(this.selectedFolder)
      if (!hasPermission) {
        throw new Error('没有文件夹写入权限，请重新选择文件夹')
      }

      const fileHandle = await this.selectedFolder.getFileHandle(filename, {
        create: true,
      })
      const writable = await fileHandle.createWritable()
      await writable.write(blob)
      await writable.close()
      return true
    } catch (error) {
      console.error('保存到文件夹失败:', error)
      return false
    }
  }

  // 下载单个视频
  async downloadVideo(videoUrl: string, fileName: string, videoId: string): Promise<boolean> {
    try {
      // 更新下载状态
      this.updateProgress(videoId, 'downloading', 0)

      // 通过 /api/video 接口下载视频
      const response = await fetch('/api/video', {
        body: JSON.stringify({ url: videoUrl }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.details || errorData.error || `HTTP error! status: ${response.status}`,
        )
      }

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? Number.parseInt(contentLength, 10) : 0

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取视频流')
      }

      const chunks: Uint8Array[] = []
      let receivedLength = 0

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        chunks.push(value)
        receivedLength += value.length

        // 更新进度
        if (total > 0) {
          const progress = Math.round((receivedLength / total) * 100)
          this.updateProgress(videoId, 'downloading', progress)
        }
      }

      // 合并所有chunks
      const blob = new Blob(chunks, { type: 'video/mp4' })
      const sanitizedFileName = this.sanitizeFileName(fileName)

      // 如果选择了文件夹且浏览器支持，则保存到指定文件夹
      if (this.selectedFolder && this.isFileSystemAccessSupported()) {
        try {
          const saved = await this.saveToFolder(blob, sanitizedFileName)
          if (!saved) {
            throw new Error('保存到文件夹失败')
          }
        } catch (error) {
          console.error('保存到文件夹失败:', error)
          // 如果保存到文件夹失败，回退到默认下载方式
          this.downloadWithDefaultMethod(blob, sanitizedFileName)
        }
      } else {
        // 使用默认下载方式
        this.downloadWithDefaultMethod(blob, sanitizedFileName)
      }

      this.updateProgress(videoId, 'completed', 100)
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '下载失败'
      this.updateProgress(videoId, 'failed', 0, errorMessage)
      return false
    }
  }

  // 批量下载视频
  async downloadVideos(
    videos: Array<{ id: string; name: string; videoUrl: string }>,
    concurrency = 3,
  ): Promise<void> {
    // 初始化下载队列
    this.downloadQueue = videos.map((video) => ({
      id: video.id,
      name: video.name,
      progress: 0,
      status: 'pending' as const,
    }))

    this.notifyProgress()

    // 分批下载，控制并发数
    const chunks = this.chunkArray(videos, concurrency)

    for (const chunk of chunks) {
      const promises = chunk.map((video) =>
        this.downloadVideo(video.videoUrl, video.name, video.id),
      )

      await Promise.allSettled(promises)

      // 添加延迟避免过于频繁的请求
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  private updateProgress(
    id: string,
    status: DownloadProgress['status'],
    progress: number,
    error?: string,
  ) {
    const item = this.downloadQueue.find((item) => item.id === id)
    if (item) {
      item.status = status
      item.progress = progress
      if (error) item.error = error
      this.notifyProgress()
    }
  }

  private notifyProgress() {
    if (this.onProgressUpdate) {
      this.onProgressUpdate([...this.downloadQueue])
    }
  }

  private sanitizeFileName(fileName: string): string {
    // 清理文件名，移除不安全字符
    return (
      fileName
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 100) + '.mp4'
    )
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  getProgress(): DownloadProgress[] {
    return [...this.downloadQueue]
  }

  clearProgress() {
    this.downloadQueue = []
    this.notifyProgress()
  }
}
