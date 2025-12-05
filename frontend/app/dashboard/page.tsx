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
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 pt-24 pb-16">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12 gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold mb-3 text-gray-900">Your Holidays</h1>
            <p className="text-base md:text-lg text-gray-700 leading-relaxed">Track and manage your flight searches</p>
          </div>
          <Link href="/dashboard/create">
            <Button size="lg" className="w-full md:w-auto">
              <Plus className="h-5 w-5 mr-2" />
              Create Holiday
            </Button>
          </Link>
        </div>

        {holidaysError && (
          <Card className="border-red-500/50 bg-red-500/5">
            <CardContent className="pt-6">
              <p className="text-red-600 font-medium">Error loading holidays. Please try again.</p>
            </CardContent>
          </Card>
        )}

        {userHolidays.length === 0 ? (
          <Card className="border-dashed border-gray-400 bg-gray-200/50">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="h-20 w-20 rounded-sm bg-gray-300 flex items-center justify-center mb-6">
                <Plane className="h-10 w-10 text-gray-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">No holidays yet</h3>
              <p className="text-gray-700 mb-8 text-center max-w-md leading-relaxed">
                Create your first holiday to start tracking flight prices and finding the best deals
              </p>
              <Link href="/dashboard/create">
                <Button size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Holiday
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {userHolidays.map((holiday) => (
              <Link key={holiday.id} href={`/dashboard/holidays/${holiday.id}`}>
                <Card className="hover:shadow-md hover:border-gray-400 transition-all duration-500 cursor-pointer h-full group">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                      {holiday.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {holiday.destinations.length} destination{holiday.destinations.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">From:</span>
                        <span className="font-semibold text-gray-900">{holiday.origin}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">Dates:</span>
                        <span className="font-semibold text-gray-900">
                          {new Date(holiday.start_date).toLocaleDateString()} -{" "}
                          {new Date(holiday.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      {holiday.budget && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">Budget:</span>
                          <span className="font-semibold text-gray-900">${holiday.budget.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="pt-3 border-t border-gray-300">
                        <p className="text-xs text-gray-600">
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
