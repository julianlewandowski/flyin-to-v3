import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import CreateHolidayForm from "@/components/create-holiday-form"
import HolidayHeader from "@/components/holiday-header"
import { Footer } from "@/components/footer"

export default async function CreateHolidayPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HolidayHeader userEmail={user.email || ""} showAlertIndicator={false} />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 pt-24 pb-16 max-w-3xl animate-fade-in-up">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-6 transition-colors duration-200">
          <span aria-hidden>←</span>
          Back to Dashboard
        </Link>
        <div className="mb-10">
          <h1 className="text-3xl md:text-5xl font-black mb-3 text-foreground tracking-tight">Plan a new trip</h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
            Tell us where and when. We'll search every day and ping you the moment the price drops.
          </p>
        </div>

        <CreateHolidayForm userId={user.id} />
      </main>
      <Footer />
    </div>
  )
}
