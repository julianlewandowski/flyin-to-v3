import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, MapPin, DollarSign, TrendingDown, Bell, Plane } from "lucide-react"
import Link from "next/link"
import type { Holiday, PriceDropAlert } from "@/lib/types"
import { fetchHolidaysForCurrentUser } from "@/lib/backend"
import GlobalPriceAlertBanner, { InlinePriceAlertIndicator } from "@/components/global-price-alert-banner"
import flyinLogo from "@/app/assets/flyin-color-logo.svg"

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
      {/* Global Price Alert Banner */}
      <GlobalPriceAlertBanner className="fixed top-0 left-0 right-0 z-[60]" />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50 supports-[backdrop-filter]:bg-white/60 mt-0 transition-all [.has-alerts_&]:mt-10">
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
      <main className="container mx-auto px-6 pt-24 pb-16">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12 gap-6 animate-fade-in-up">
          <div>
            <h1 className="text-3xl md:text-5xl font-black mb-3 text-foreground tracking-tight">Your Holidays</h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">Track and manage your flight searches</p>
          </div>
          <Link href="/dashboard/create">
            <Button size="lg" className="w-full md:w-auto shadow-lg shadow-blue-500/20">
              <Plus className="h-5 w-5 mr-2" />
              Create Holiday
            </Button>
          </Link>
        </div>

        {holidaysError && (
          <Card className="border-destructive/50 bg-destructive/5 mb-8">
            <CardContent className="pt-6">
              <p className="text-destructive font-medium">Error loading holidays. Please try again.</p>
            </CardContent>
          </Card>
        )}

        {userHolidays.length === 0 ? (
          <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <Card className="border-dashed border-border bg-secondary/30">
              <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-24 w-24 rounded-full bg-blue-50 flex items-center justify-center mb-6 text-blue-500 animate-float-slow">
                  <Plane className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">No holidays yet</h3>
                <p className="text-muted-foreground mb-8 max-w-md leading-relaxed">
                  Create your first holiday to start tracking flight prices and finding the best deals across multiple destinations.
                </p>
                <Link href="/dashboard/create">
                  <Button size="lg" className="shadow-lg hover:scale-105 transition-transform">
                    <Plus className="h-5 w-5 mr-2" />
                    Create Your First Holiday
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {userHolidays.map((holiday, index) => (
              <Link 
                key={holiday.id} 
                href={`/dashboard/holidays/${holiday.id}`}
                className="block animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Card className={`group cursor-pointer h-full hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  holiday.has_active_price_alert ? "ring-2 ring-emerald-400 border-emerald-400 bg-emerald-50/10" : ""
                }`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">
                          {holiday.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {holiday.destinations.length} destination{holiday.destinations.length !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                      
                      {/* Status Badges */}
                      <div className="flex flex-col items-end gap-2">
                        {holiday.has_active_price_alert && (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-sm animate-pulse-slow">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Price Drop
                          </Badge>
                        )}
                        {holiday.price_tracking_enabled && !holiday.has_active_price_alert && (
                          <div className="h-8 w-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 shadow-sm">
                            <Bell className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm py-2 border-b border-border/50">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>Origin</span>
                          </div>
                          <span className="font-semibold text-foreground">{holiday.origin}</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm py-2 border-b border-border/50">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Dates</span>
                          </div>
                          <span className="font-semibold text-foreground text-right">
                            {new Date(holiday.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} -{" "}
                            {new Date(holiday.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        
                        {holiday.budget && (
                          <div className="flex items-center justify-between text-sm py-2 border-b border-border/50">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <DollarSign className="h-4 w-4" />
                              <span>Budget</span>
                            </div>
                            <span className="font-semibold text-foreground">${holiday.budget.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground truncate">
                          To: {holiday.destinations.slice(0, 3).join(", ")}
                          {holiday.destinations.length > 3 && ` +${holiday.destinations.length - 3} more`}
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
