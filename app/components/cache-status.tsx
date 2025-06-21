'use client'

import { Clock, Database, Download, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { storage } from '@/lib/storage'

interface VideoInfo {
  id: string
  name: string
  cover: string
  videoUrl: string
  success: boolean
  error?: string
}

interface CacheStatusProps {
  results: VideoInfo[]
  onClearCache: () => void
}

export function CacheStatus({ results, onClearCache }: CacheStatusProps) {
  const [cacheSize, setCacheSize] = useState<string>('0 KB')
  const [cacheAvailable, setCacheAvailable] = useState(false)

  useEffect(() => {
    setCacheAvailable(storage.isAvailable())

    if (storage.isAvailable() && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('video-url-processor-cache')
        if (stored) {
          const sizeInBytes = new Blob([stored]).size
          const sizeInKB = (sizeInBytes / 1024).toFixed(2)
          setCacheSize(`${sizeInKB} KB`)
        }
      } catch (error) {
        console.warn('Failed to calculate cache size:', error)
      }
    }
  }, [results])

  const exportCache = () => {
    if (typeof window === 'undefined') return

    const cachedData = storage.load()
    if (cachedData) {
      const dataStr = JSON.stringify(cachedData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `video-cache-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  if (!cacheAvailable) {
    return (
      <Card className='border-yellow-200 bg-yellow-50'>
        <CardContent className='p-4'>
          <div className='flex items-center text-yellow-700'>
            <Database className='h-4 w-4 mr-2' />
            <span className='text-sm'>localStorage 不可用，无法保存缓存</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const successCount = results.filter((r) => r.success).length
  const totalCount = results.length

  return (
    <Card className='border-blue-200 bg-blue-50'>
      <CardContent className='p-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <div className='flex items-center text-blue-700'>
              <Database className='h-4 w-4 mr-2' />
              <span className='text-sm font-medium'>缓存状态</span>
            </div>
            <div className='flex items-center space-x-2'>
              <Badge className='text-xs' variant='secondary'>
                <Clock className='h-3 w-3 mr-1' />
                {cacheSize}
              </Badge>
              {totalCount > 0 && (
                <Badge
                  className='text-xs'
                  variant={successCount === totalCount ? 'default' : 'destructive'}
                >
                  {successCount}/{totalCount} 成功
                </Badge>
              )}
            </div>
          </div>
          <div className='flex items-center space-x-2'>
            {totalCount > 0 && (
              <Button
                className='h-7 px-2 text-xs hover:bg-blue-100'
                onClick={exportCache}
                size='sm'
                variant='ghost'
              >
                <Download className='h-3 w-3 mr-1' />
                导出
              </Button>
            )}
            <Button
              className='h-7 px-2 text-xs hover:bg-red-100 hover:text-red-600'
              onClick={onClearCache}
              size='sm'
              variant='ghost'
            >
              <Trash2 className='h-3 w-3 mr-1' />
              清除
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
