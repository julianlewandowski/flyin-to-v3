import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import CreateHolidayForm from "@/components/create-holiday-form"
import flyinLogo from "@/app/assets/flyin-color-logo.svg"
import { Button } from "@/components/ui/button"

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
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50 supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 transition-transform hover:scale-105">
            <img 
              src={flyinLogo.src || flyinLogo}
              alt="Flyin.to" 
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground hidden md:block">{user.email}</span>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm" className="rounded-full">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 pt-32 pb-16 max-w-3xl animate-fade-in-up">
        <div className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4 text-foreground tracking-tight">Create a New Holiday</h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Set up your travel preferences and we'll start tracking the best flight deals for you
          </p>
        </div>

        <CreateHolidayForm userId={user.id} />
      </main>
    </div>
  )
}
