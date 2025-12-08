import { Plane } from "lucide-react"
import Link from "next/link"
import { InlinePriceAlertIndicator } from "@/components/global-price-alert-banner"

interface HolidayHeaderProps {
  userEmail: string
}

export default function HolidayHeader({ userEmail }: HolidayHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-300">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Plane className="h-6 w-6 text-blue-500" />
          <span className="text-xl font-bold text-gray-900">Flyin.to</span>
        </Link>
        <div className="flex items-center gap-4">
          <InlinePriceAlertIndicator />
          <span className="text-sm text-gray-600 hidden md:block">{userEmail}</span>
        </div>
      </div>
    </header>
  )
}
