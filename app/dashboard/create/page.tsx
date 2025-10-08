import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Plane } from "lucide-react"
import Link from "next/link"
import CreateHolidayForm from "@/components/create-holiday-form"

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">Flyin.to</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create a New Holiday</h1>
          <p className="text-muted-foreground">
            Set up your travel preferences and we'll start tracking the best flight deals for you
          </p>
        </div>

        <CreateHolidayForm userId={user.id} />
      </main>
    </div>
  )
}
