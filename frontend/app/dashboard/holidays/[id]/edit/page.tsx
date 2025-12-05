import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Plane } from "lucide-react"
import Link from "next/link"
import EditHolidayForm from "@/components/edit-holiday-form"
import type { Holiday } from "@/lib/types"

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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-300">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Plane className="h-6 w-6 text-blue-500" />
            <span className="text-xl font-bold text-gray-900">Flyin.to</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden md:block">{user.email}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 pt-24 pb-16 max-w-2xl">
        <div className="mb-12">
          <h1 className="text-3xl md:text-5xl font-bold mb-3 text-gray-900">Edit Holiday</h1>
          <p className="text-base md:text-lg text-gray-700 leading-relaxed">
            Update your travel preferences, dates, destinations, and other parameters
          </p>
        </div>

        <EditHolidayForm holiday={holidayData} />
      </main>
    </div>
  )
}

