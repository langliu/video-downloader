'use client'

import { Copy, Link } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface UrlTooltipProps {
  urls: string[]
  count: number
}

export function UrlTooltip({ urls, count }: UrlTooltipProps) {
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).catch(() => {
      // 静默处理复制失败
    })
  }

  const copyAllUrls = () => {
    const allUrls = urls.join('\n')
    navigator.clipboard.writeText(allUrls).catch(() => {
      // 静默处理复制失败
    })
  }

  const formatUrl = (url: string, maxLength = 45) => {
    if (url.length <= maxLength) return url

    try {
      const urlObj = new URL(url)
      const domain = urlObj.hostname
      const path = urlObj.pathname + urlObj.search

      if (domain.length + path.length <= maxLength) {
        return `${domain}${path}`
      }

      const availablePathLength = maxLength - domain.length - 3
      if (availablePathLength > 10) {
        return `${domain}${path.substring(0, availablePathLength)}...`
      }

      return `${domain}...`
    } catch {
      return url.length > maxLength ? `${url.substring(0, maxLength - 3)}...` : url
    }
  }

  if (count === 0) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className='cursor-help hover:bg-blue-100 transition-colors' variant='secondary'>
            <Link className='h-3 w-3 mr-1' />
            检测到 {count} 个有效URL
          </Badge>
        </TooltipTrigger>
        <TooltipContent className='max-w-lg p-0' side='top'>
          <div className='p-3'>
            <div className='flex items-center justify-between mb-2'>
              <p className='font-medium text-sm text-gray-900'>有效URL列表</p>
              {urls.length > 1 && (
                <Button
                  className='h-6 px-2 text-xs hover:bg-gray-100'
                  onClick={copyAllUrls}
                  size='sm'
                  variant='ghost'
                >
                  <Copy className='h-3 w-3 mr-1' />
                  全部复制
                </Button>
              )}
            </div>
            <ScrollArea className='max-h-48'>
              <div className='space-y-1'>
                {urls.slice(0, 15).map((url, index) => (
                  <div
                    className='group flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-2 rounded text-xs transition-colors'
                    key={index}
                  >
                    <div className='flex-1 min-w-0'>
                      <div className='font-mono text-gray-700 overflow-hidden whitespace-nowrap'>
                        {formatUrl(url)}
                      </div>
                      {url !== formatUrl(url) && (
                        <div className='text-gray-500 mt-1 text-[10px]' title={url}>
                          {url}
                        </div>
                      )}
                    </div>
                    <Button
                      className='h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2 hover:bg-gray-200'
                      onClick={() => copyToClipboard(url)}
                      size='sm'
                      variant='ghost'
                    >
                      <Copy className='h-3 w-3' />
                    </Button>
                  </div>
                ))}
                {urls.length > 15 && (
                  <div className='text-center py-2'>
                    <Badge className='text-xs' variant='outline'>
                      还有 {urls.length - 15} 个URL未显示
                    </Badge>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
