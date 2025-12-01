import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Calendar, MapPin, DollarSign, Plane } from "lucide-react"
import Link from "next/link"
import type { Holiday } from "@/lib/types"
import { fetchHolidaysForCurrentUser } from "@/lib/backend"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  let userHolidays: Holiday[] = []
  let holidaysError: Error | null = null

  try {
    userHolidays = await fetchHolidaysForCurrentUser()
  } catch (err) {
    holidaysError = err as Error
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
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Holidays</h1>
            <p className="text-muted-foreground">Track and manage your flight searches</p>
          </div>
          <Link href="/dashboard/create">
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create Holiday
            </Button>
          </Link>
        </div>

        {holidaysError && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Error loading holidays. Please try again.</p>
            </CardContent>
          </Card>
        )}

        {userHolidays.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Plane className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No holidays yet</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Create your first holiday to start tracking flight prices and finding the best deals
              </p>
              <Link href="/dashboard/create">
                <Button>
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Holiday
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userHolidays.map((holiday) => (
              <Link key={holiday.id} href={`/dashboard/holidays/${holiday.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="text-xl">{holiday.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {holiday.destinations.length} destination{holiday.destinations.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">From:</span>
                        <span className="font-medium">{holiday.origin}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Dates:</span>
                        <span className="font-medium">
                          {new Date(holiday.start_date).toLocaleDateString()} -{" "}
                          {new Date(holiday.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      {holiday.budget && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Budget:</span>
                          <span className="font-medium">${holiday.budget.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          To: {holiday.destinations.slice(0, 2).join(", ")}
                          {holiday.destinations.length > 2 && ` +${holiday.destinations.length - 2} more`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
