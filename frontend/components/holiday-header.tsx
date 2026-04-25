import Link from "next/link"
import { InlinePriceAlertIndicator } from "@/components/global-price-alert-banner"
import flyinLogo from "@/app/assets/flyin-color-logo.svg"
import UserMenu from "@/components/user-menu"

interface HolidayHeaderProps {
  userEmail: string
  showAlertIndicator?: boolean
}

export default function HolidayHeader({ userEmail, showAlertIndicator = true }: HolidayHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/70 supports-[backdrop-filter]:bg-white/60 transition-all duration-300">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 transition-transform hover:scale-[1.03] duration-200">
          <img
            src={flyinLogo.src || flyinLogo}
            alt="Flyin.to"
            className="h-7 w-auto"
          />
        </Link>
        <div className="flex items-center gap-3">
          {showAlertIndicator && <InlinePriceAlertIndicator />}
          <UserMenu userEmail={userEmail} />
        </div>
      </div>
    </header>
  )
}
