import Link from "next/link"
import { InlinePriceAlertIndicator } from "@/components/global-price-alert-banner"
import flyinLogo from "@/app/assets/flyin-color-logo.svg"
import { Button } from "@/components/ui/button"

interface HolidayHeaderProps {
  userEmail: string
}

export default function HolidayHeader({ userEmail }: HolidayHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50 supports-[backdrop-filter]:bg-white/60 transition-all duration-300">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 transition-transform hover:scale-105 duration-200">
          <img 
            src={flyinLogo.src || flyinLogo}
            alt="Flyin.to" 
            className="h-8 w-auto"
          />
        </Link>
        <div className="flex items-center gap-4">
          <InlinePriceAlertIndicator />
          <span className="text-sm font-medium text-muted-foreground hidden md:block">{userEmail}</span>
          <form action="/auth/signout" method="post">
            <Button variant="ghost" size="sm" className="rounded-full">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
