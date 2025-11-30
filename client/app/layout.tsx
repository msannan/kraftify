import type { Metadata } from 'next'
import './globals.css'
import ClientLayout from '../components/ClientLayout'

export const metadata: Metadata = {
  title: 'Kraftify - Connect with Skilled Professionals',
  description: 'Digital marketplace for skilled workers to connect directly with customers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}

