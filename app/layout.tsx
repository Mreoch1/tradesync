import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AiTradr - Fantasy Sports Trade Analyzer',
  description: 'Advanced fantasy sports trade analysis with real-time Yahoo Fantasy Sports synchronization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full antialiased">{children}</body>
    </html>
  )
}

