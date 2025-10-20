import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

dotenv.config({
  path: '../../apps/server/.env',
})

export default defineConfig({
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
  // DOCS: https://orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit
  dialect: 'sqlite',
  driver: 'd1-http',
  out: './src/migrations',
  schema: './src/schema',
})
