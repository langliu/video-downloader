import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { authClient } from '@/lib/auth-client'
import { authMiddleware } from '@/middleware/auth'

export const getPayment = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async () => {
    const { data: customerState } = await authClient.customer.state({
      fetchOptions: {
        headers: getRequestHeaders(),
      },
    })
    return customerState
  })
