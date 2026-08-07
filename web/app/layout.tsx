import type { Metadata } from 'next'
import '../src/style/fonts.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'OneSource — Connect to Claude.ai',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
