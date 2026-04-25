import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import EditHolidayForm from "@/components/edit-holiday-form"
import HolidayHeader from "@/components/holiday-header"
import type { Holiday } from "@/lib/types"
import { Footer } from "@/components/footer"

export default async function EditHolidayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  // Fetch holiday details
  const { data: holiday, error: holidayError } = await supabase.from("holidays").select("*").eq("id", id).single()

  if (holidayError || !holiday) {
    redirect("/dashboard")
  }

  // Verify user owns this holiday (RLS should handle this, but double-check)
  if (holiday.user_id !== user.id) {
    redirect("/dashboard")
  }

  const holidayData = holiday as Holiday

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HolidayHeader userEmail={user.email || ""} showAlertIndicator={false} />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 pt-24 pb-16 max-w-3xl animate-fade-in-up">
        <Link href={`/dashboard/holidays/${id}`} className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-6 transition-colors duration-200">
          <span aria-hidden>←</span>
          Back to Holiday
        </Link>
        <div className="mb-10">
          <h1 className="text-3xl md:text-5xl font-black mb-3 text-foreground tracking-tight">Edit Holiday</h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
            Update your travel preferences, dates, destinations, and other parameters
          </p>
        </div>

        <EditHolidayForm holiday={holidayData} />
      </main>
      <Footer />
    </div>
  )
}
