import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MEDCARE24 | Secure Ambulance Data Transmission',
  description: 'Encrypted vital signs from ambulance to hospital in real time',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>{children}</body>
    </html>
  )
}
