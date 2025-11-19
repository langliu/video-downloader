import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/video-upload')({
  component: RouteComponent,
})

function RouteComponent() {
  const [text, setText] = useState('')

  const urls = useMemo(() => {
    return text
      .split(/\n|,/) // 换行或逗号分割
      .map((s) => s.trim())
      .filter((s) => s.length >= 10) // 过滤掉长度小于 10 的无效项
  }, [text])

  const submitMutation = useMutation({
    mutationFn: async () => {
      const base = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000'
      const resp = await fetch(`${base}/video-saves`, {
        body: JSON.stringify({ urls }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!resp.ok) throw new Error('提交失败')
      return resp.json()
    },
  })

  return (
    <div className='px-4 py-10'>
      <h1 className='mb-4 text-center font-semibold text-2xl'>
        批量提交视频链接
      </h1>
      <div className='flex justify-center'>
        <div className='w-3/4'>
          <label className='mb-2 block text-sm' htmlFor='urls-input'>
            输入多个链接，使用换行或逗号分隔
          </label>
          <textarea
            className='min-h-[180px] w-full rounded border px-3 py-2'
            id='urls-input'
            onChange={(e) => setText(e.target.value)}
            placeholder='https://example.com/1\nhttps://example.com/2, https://example.com/3'
            value={text}
          />
          <div className='mt-2 text-muted-foreground text-sm'>
            已解析有效链接：{urls.length}
          </div>
          <div className='mt-4 flex justify-center'>
            <Button
              disabled={submitMutation.isPending || urls.length === 0}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? '提交中…' : '提交到后台'}
            </Button>
          </div>
          {submitMutation.error ? (
            <div className='mt-2 text-center text-red-500'>
              {(submitMutation.error as Error).message}
            </div>
          ) : null}
          {submitMutation.isSuccess ? (
            <div className='mt-2 text-center text-green-600'>提交成功</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
