import { join } from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: '**',
        protocol: 'https',
      },
      {
        hostname: '**',
        protocol: 'http',
      },
    ],
  },
  reactCompiler: true,
  turbopack: {
    root: join(__dirname, '..'),
  },
}

export default nextConfig
