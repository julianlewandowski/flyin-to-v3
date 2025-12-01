import { Plane } from "lucide-react"
import Link from "next/link"

interface HolidayHeaderProps {
  userEmail: string
}

export default function HolidayHeader({ userEmail }: HolidayHeaderProps) {
  return (
    <header className="border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Plane className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-foreground">Flyin.to</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{userEmail}</span>
        </div>
      </div>
    </header>
  )
}
