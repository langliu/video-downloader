import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  description: '花花的工具箱（私人定制）',
  title: '花花的工具箱',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='zh-CN'>
      <body className={'antialiased'}>{children}</body>
    </html>
  )
}
