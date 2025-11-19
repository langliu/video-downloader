import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/videos')({
  component: RouteComponent,
})

function RouteComponent() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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

  return (
    <div className='container mx-auto px-4 py-6'>
      <div className='mb-4 flex items-center justify-between'>
        <h1 className='font-semibold text-xl'>Video List</h1>
        <div className='flex items-center gap-2'>
          <label className='text-sm' htmlFor='page-size'>
            Page Size
          </label>
          <select
            className='rounded border px-2 py-1'
            id='page-size'
            onChange={(e) => {
              setPageSize(Number.parseInt(e.target.value, 10) || 10)
              setPage(1)
            }}
            value={pageSize}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {query.isPending ? (
        <div>Loading...</div>
      ) : query.error ? (
        <div className='text-red-500'>{(query.error as Error).message}</div>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {items.map((it) => (
            <div className='rounded border p-3' key={it.id}>
              <div className='mb-2 break-all text-muted-foreground text-sm'>
                {it.link}
              </div>
              <div className='mb-2 font-medium'>{it.name ?? it.ossKey}</div>
              <video className='w-full' controls src={it.signedUrl}>
                <track
                  default
                  kind='captions'
                  label='captions'
                  src=''
                  srcLang='zh'
                />
              </video>
              <div className='mt-2 flex gap-2'>
                <a
                  className='text-blue-500 underline'
                  href={it.signedUrl}
                  rel='noreferrer'
                  target='_blank'
                >
                  Open
                </a>
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
