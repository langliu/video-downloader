import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import Loader from './components/loader'
import './index.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import { orpc, queryClient } from './utils/orpc'

export const getRouter = () => {
  const router = createTanStackRouter({
    context: { orpc, queryClient },
    defaultNotFoundComponent: () => <div>Not Found</div>,
    defaultPendingComponent: () => <Loader />,
    defaultPreloadStaleTime: 0,
    routeTree,
    scrollRestoration: true,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
