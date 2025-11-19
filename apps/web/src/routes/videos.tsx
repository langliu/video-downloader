import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/videos')({
  component: RouteComponent,
})

function RouteComponent() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [durations, setDurations] = useState<Record<string, string>>({})
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null)
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const query = useQuery({
    queryFn: async () => {
      console.log('VITE_BACKEND_URL', import.meta.env)
      const base = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000'
      const url = `${base}/api/videos?page=${page}&pageSize=${pageSize}`
      const resp = await fetch(url)
      if (!resp.ok) throw new Error('Failed to fetch')
      return resp.json() as Promise<{
        items: Array<{
          id: string
          name: string | null
          link: string
          ossKey: string
          signedUrl: string
        }>
        page: number
        pageSize: number
        total: number
        totalPages: number
      }>
    },
    queryKey: ['videos', page, pageSize],
  })

  const items = query.data?.items ?? []
  const totalPages = query.data?.totalPages ?? 1
  const gridCols = useMemo(
    () => ({ base: 'grid-cols-1', lg: 'lg:grid-cols-3', md: 'md:grid-cols-2' }),
    [],
  )

  return (
    <div className='container mx-auto px-4 py-6'>
      <div className='mb-4 flex items-center justify-between'>
        <h1 className='font-semibold text-xl'>视频列表</h1>
        <div className='flex items-center gap-2'>
          <label className='text-sm' htmlFor='page-size'>
            每页数量
          </label>
          <select
            className='rounded-md border bg-card px-2 py-1'
            id='page-size'
            onChange={(e) => {
              setPageSize(Number.parseInt(e.target.value, 10) || 10)
              setPage(1)
            }}
            value={pageSize}
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {query.isPending ? (
        <div>Loading...</div>
      ) : query.error ? (
        <div className='text-red-500'>{(query.error as Error).message}</div>
      ) : (
        <div
          className={`grid gap-4 ${gridCols.base} ${gridCols.md} ${gridCols.lg}`}
        >
          {items.map((it) => (
            <div
              className='hover:-translate-y-0.5 overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-lg'
              key={it.id}
            >
              <div className='group relative aspect-video'>
                <video
                  className='absolute inset-0 h-full w-full object-cover'
                  controls={false}
                  muted
                  onEnded={() => {
                    if (currentPlayingId === it.id) setCurrentPlayingId(null)
                  }}
                  onLoadedMetadata={(e) => {
                    const d = (e.currentTarget as HTMLVideoElement).duration
                    setDurations((prev) => ({
                      ...prev,
                      [it.id]: formatDuration(d),
                    }))
                  }}
                  onPlay={() => {
                    setCurrentPlayingId(it.id)
                    Object.entries(videoRefs.current).forEach(([id, el]) => {
                      if (id !== it.id && el) {
                        el.pause()
                      }
                    })
                  }}
                  playsInline
                  ref={(el) => {
                    videoRefs.current[it.id] = el
                  }}
                  src={it.signedUrl}
                >
                  <track
                    default
                    kind='captions'
                    label='captions'
                    src=''
                    srcLang='zh'
                  />
                </video>
                <div className='pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3'>
                  <div className='line-clamp-2 font-medium text-sm text-white'>
                    {it.name ?? it.ossKey}
                  </div>
                </div>
                <div className='absolute top-2 right-2 rounded bg-black/70 px-2 py-1 text-white text-xs'>
                  {durations[it.id] ?? '00:00'}
                </div>
                <div className='absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100'>
                  <button
                    aria-label='toggle play'
                    className='rounded-full bg-black/60 px-4 py-3 text-white backdrop-blur'
                    onClick={() => {
                      const el = videoRefs.current[it.id]
                      if (!el) return
                      if (el.paused) {
                        Object.entries(videoRefs.current).forEach(([id, v]) => {
                          if (id !== it.id && v) v.pause()
                        })
                        el.play()
                        setCurrentPlayingId(it.id)
                      } else {
                        el.pause()
                        setCurrentPlayingId(null)
                      }
                    }}
                    type='button'
                  >
                    {currentPlayingId === it.id ? '⏸' : '▶︎'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className='mt-6 flex items-center justify-between'>
        <div className='text-sm'>
          Page {page} / {totalPages}
        </div>
        <div className='flex gap-2'>
          <Button
            disabled={page <= 1 || query.isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            variant='outline'
          >
            Prev
          </Button>
          <Button
            disabled={page >= totalPages || query.isFetching}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
