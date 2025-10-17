import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ClientWrapper from '@/components/ClientWrapper'
import NotificationWrapper from '@/components/NotificationWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'UOB Security House - Crypto Gold Trading Platform',
  description: 'Trade cryptocurrency for gold with secure custodial services',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientWrapper>
          <NotificationWrapper>
            {children}
          </NotificationWrapper>
        </ClientWrapper>
      </body>
    </html>
  )
}