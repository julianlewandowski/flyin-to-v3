import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Flyin.to - Find the Best Flight Deals",
  description: "Track prices across multiple destinations and never miss a deal. Perfect for flexible travelers.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} antialiased`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
