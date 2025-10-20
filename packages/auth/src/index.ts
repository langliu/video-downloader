import { env } from 'cloudflare:workers'
import { checkout, polar, portal } from '@polar-sh/better-auth'
import { db } from '@video-downloader/db'
import * as schema from '@video-downloader/db/schema/auth'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { polarClient } from './lib/payments'

export const auth = betterAuth({
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    },
    // uncomment crossSubDomainCookies setting when ready to deploy and replace <your-workers-subdomain> with your actual workers subdomain
    // https://developers.cloudflare.com/workers/wrangler/configuration/#workersdev
    // crossSubDomainCookies: {
    //   enabled: true,
    //   domain: "<your-workers-subdomain>",
    // },
  },
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'sqlite',

    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      enableCustomerPortal: true,
      use: [
        checkout({
          authenticatedUsersOnly: true,
          products: [
            {
              productId: 'your-product-id',
              slug: 'pro',
            },
          ],
          successUrl: env.POLAR_SUCCESS_URL,
        }),
        portal(),
      ],
    }),
  ],
  // uncomment cookieCache setting when ready to deploy to Cloudflare using *.workers.dev domains
  // session: {
  //   cookieCache: {
  //     enabled: true,
  //     maxAge: 60,
  //   },
  // },
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : [],,
})
