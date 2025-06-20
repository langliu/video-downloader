'use client'

import { CheckCircle, Clock, Download, X, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'

interface DownloadProgress {
  id: string
  name: string
  status: 'pending' | 'downloading' | 'completed' | 'failed'
  progress: number
  error?: string
}

interface DownloadProgressProps {
  progress: DownloadProgress[]
  onClose: () => void
}

export function DownloadProgressModal({ progress, onClose }: DownloadProgressProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(progress.length > 0)
  }, [progress])

  if (!isVisible) return null

  const completedCount = progress.filter((p) => p.status === 'completed').length
  const failedCount = progress.filter((p) => p.status === 'failed').length
  const downloadingCount = progress.filter((p) => p.status === 'downloading').length
  const pendingCount = progress.filter((p) => p.status === 'pending').length

  const getStatusIcon = (status: DownloadProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className='h-4 w-4 text-green-600' />
      case 'failed':
        return <XCircle className='h-4 w-4 text-red-600' />
      case 'downloading':
        return <Download className='h-4 w-4 text-blue-600 animate-pulse' />
      case 'pending':
        return <Clock className='h-4 w-4 text-gray-400' />
    }
  }

  const getStatusColor = (status: DownloadProgress['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'downloading':
        return 'bg-blue-500'
      case 'pending':
        return 'bg-gray-300'
    }
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <Card className='w-full max-w-2xl max-h-[80vh] flex flex-col'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
          <CardTitle className='text-lg font-semibold'>下载进度</CardTitle>
          <Button className='h-8 w-8 p-0' onClick={onClose} size='sm' variant='ghost'>
            <X className='h-4 w-4' />
          </Button>
        </CardHeader>
        <CardContent className='flex-1 overflow-hidden'>
          <div className='space-y-4'>
            {/* 统计信息 */}
            <div className='flex items-center space-x-4 text-sm'>
              <Badge variant='secondary'>总计: {progress.length}</Badge>
              {completedCount > 0 && (
                <Badge className='bg-green-100 text-green-800'>完成: {completedCount}</Badge>
              )}
              {downloadingCount > 0 && (
                <Badge className='bg-blue-100 text-blue-800'>下载中: {downloadingCount}</Badge>
              )}
              {pendingCount > 0 && <Badge variant='outline'>等待: {pendingCount}</Badge>}
              {failedCount > 0 && <Badge variant='destructive'>失败: {failedCount}</Badge>}
            </div>

            {/* 总体进度 */}
            <div className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span>总体进度</span>
                <span>{Math.round((completedCount / progress.length) * 100)}%</span>
              </div>
              <Progress className='h-2' value={(completedCount / progress.length) * 100} />
            </div>

            {/* 详细进度列表 */}
            <ScrollArea className='h-64'>
              <div className='space-y-3'>
                {progress.map((item) => (
                  <div className='border rounded-lg p-3 space-y-2' key={item.id}>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center space-x-2 flex-1 min-w-0'>
                        {getStatusIcon(item.status)}
                        <span className='text-sm font-medium truncate' title={item.name}>
                          {item.name}
                        </span>
                      </div>
                      <Badge className='text-xs' variant='outline'>
                        {item.status === 'downloading' ? `${item.progress}%` : item.status}
                      </Badge>
                    </div>

                    {item.status === 'downloading' && (
                      <Progress
                        className={`h-1 ${getStatusColor(item.status)}`}
                        value={item.progress}
                      />
                    )}

                    {item.status === 'failed' && item.error && (
                      <p className='text-xs text-red-600 bg-red-50 p-2 rounded'>{item.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
