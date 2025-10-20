import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import { createRouterClient } from '@orpc/server'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { QueryCache, QueryClient } from '@tanstack/react-query'
import { createIsomorphicFn } from '@tanstack/react-start'
import { createContext } from '@video-downloader/api/context'
import { appRouter } from '@video-downloader/api/routers/index'
import { toast } from 'sonner'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(`Error: ${error.message}`, {
        action: {
          label: 'retry',
          onClick: () => {
            queryClient.invalidateQueries()
          },
        },
      })
    },
  }),
})

const getORPCClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(appRouter, {
      context: async ({ req }) => {
        return createContext({ req })
      },
    }),
  )
  .client((): RouterClient<typeof appRouter> => {
    const link = new RPCLink({
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        })
      },
      url: `${import.meta.env.VITE_SERVER_URL}/rpc`,
    })

    return createORPCClient(link)
  })

export const client: RouterClient<typeof appRouter> = getORPCClient()

export const orpc = createTanstackQueryUtils(client)
