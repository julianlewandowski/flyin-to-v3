import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import CreateHolidayForm from "@/components/create-holiday-form"
import flyinLogo from "@/app/assets/flyin-color-logo.svg"
import { Button } from "@/components/ui/button"
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/70 supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 transition-transform hover:scale-[1.03] duration-200">
            <img
              src={flyinLogo.src || flyinLogo}
              alt="Flyin.to"
              className="h-7 w-auto"
            />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground hidden md:block">{user.email}</span>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm" aria-label="Sign out">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 pt-24 pb-16 max-w-3xl animate-fade-in-up">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-6 transition-colors duration-200">
          <span aria-hidden>←</span>
          Back to Dashboard
        </Link>
        <div className="mb-10">
          <h1 className="text-3xl md:text-5xl font-black mb-3 text-foreground tracking-tight">Create a New Holiday</h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
            Set up your travel preferences and we'll start tracking the best flight deals for you
          </p>
        </div>

        <CreateHolidayForm userId={user.id} />
      </main>
      <Footer />
    </div>
  )
}
