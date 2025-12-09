import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, MapPin, DollarSign, Plane, TrendingDown, Sparkles, Edit } from "lucide-react"
import Link from "next/link"
import type { Holiday, Flight, AIInsight, Alert, PriceDropAlert as PriceDropAlertType } from "@/lib/types"
import HolidayHeader from "@/components/holiday-header"
import FlightList from "@/components/flight-list"
import GenerateInsightsButton from "@/components/generate-insights-button"
import AiScoutButton from "@/components/ai-scout-button"
import VerifyFlightsButton from "@/components/verify-flights-button"
import UnifiedFlightSearchButton from "@/components/unified-flight-search-button"
import AutoFlightSearch from "@/components/auto-flight-search"
import SmartInsightsSection from "@/components/smart-insights"
import PriceTrackingToggle from "@/components/price-tracking-toggle"
import PriceDropAlert from "@/components/price-drop-alert"
import GlobalPriceAlertBanner from "@/components/global-price-alert-banner"
import { Footer } from "@/components/footer"

function getTimeAgo(dateString: string): string {
  if (!dateString) return "Never"
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  return date.toLocaleDateString()
}

export default async function HolidayDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Fetch flights for this holiday
  // Default sort by price (ascending) - client-side sorting will handle the rest
  const { data: flights, error: flightsError } = await supabase
    .from("flights")
    .select("*")
    .eq("holiday_id", id)
    .order("price", { ascending: true })

  if (flightsError) {
    console.error("[Dashboard] Error fetching flights:", flightsError)
  }

  // Fetch AI insights
  const { data: insights } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("holiday_id", id)
    .order("created_at", { ascending: false })

  // Fetch alerts (old system)
  const { data: alerts } = await supabase
    .from("alerts")
    .select("*")
    .eq("holiday_id", id)
    .order("created_at", { ascending: false })
    .limit(5)

  // Fetch price drop alerts (new system)
  const { data: priceDropAlerts } = await supabase
    .from("price_drop_alerts")
    .select("*")
    .eq("holiday_id", id)
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(5)

  const holidayData = holiday as Holiday
  const flightData = (flights as Flight[]) || []
  const insightData = (insights as AIInsight[]) || []
  const alertData = (alerts as Alert[]) || []
  const priceDropAlertData = (priceDropAlerts as PriceDropAlertType[]) || []

  // Only show old AI Scout if using AI discovery but no destinations AND no old AI results
  const needsAiScan = holidayData.use_ai_discovery && 
                      (!holidayData.destinations || holidayData.destinations.length === 0) && 
                      !holidayData.ai_discovery_results
  const hasAiResults = holidayData.ai_discovery_results && holidayData.ai_discovery_results.length > 0

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Global Price Alert Banner for this holiday */}
      {holidayData.has_active_price_alert && (
        <GlobalPriceAlertBanner holidayId={id} className="fixed top-0 left-0 right-0 z-[60]" />
      )}
      
      <HolidayHeader userEmail={user.email || ""} />

      {/* Auto-trigger flight search if needed - disabled by default to prevent errors */}
      <AutoFlightSearch
        holidayId={id}
        hasFlights={flightData.length > 0}
        lastSearchDate={flightData.length > 0 ? flightData[0]?.last_checked || flightData[0]?.created_at : null}
        autoSearchEnabled={false}
      />

      {/* Main Content */}
      <main className={`flex-1 container mx-auto px-6 pb-16 animate-fade-in-up ${holidayData.has_active_price_alert ? "pt-24" : "pt-20"}`}>
        <Link href="/dashboard">
          <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary mb-6 transition-colors duration-300">
            <ArrowLeft className="h-3 w-3" />
            Back to Dashboard
          </button>
        </Link>

        {/* Price Drop Alert - Show prominently at the top if active */}
        {priceDropAlertData.length > 0 && (
          <div className="mb-8 space-y-4 animate-float-slow">
            {priceDropAlertData.map((alert) => (
              <PriceDropAlert
                key={alert.id}
                alert={alert}
                holidayName={holidayData.name}
                showHolidayName={false}
                onViewFlights={() => {
                  // Scroll to flights section
                  document.getElementById("flights-section")?.scrollIntoView({ behavior: "smooth" })
                }}
              />
            ))}
          </div>
        )}

        {/* Holiday Info */}
        <Card className="mb-6 border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{holidayData.name}</CardTitle>
                <CardDescription className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                  <Calendar className="h-3 w-3" />
                  Created on {new Date(holidayData.created_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {holidayData.use_ai_discovery && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                    <Sparkles className="h-3 w-3" />
                    AI Discovery
                  </Badge>
                )}
                <Link href={`/dashboard/holidays/${id}/edit`}>
                  <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1.5 rounded-full">
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <MapPin className="h-3 w-3 text-primary" />
                  {holidayData.origins && holidayData.origins.length > 1 ? "Origins" : "Origin"}
                </div>
                <p className="font-semibold text-base text-foreground">
                  {holidayData.origins ? holidayData.origins.join(", ") : holidayData.origin}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <MapPin className="h-3 w-3 text-primary" />
                  Destinations
                </div>
                <p className="font-semibold text-base text-foreground">
                  {holidayData.destinations && holidayData.destinations.length > 0
                    ? holidayData.destinations.join(", ")
                    : "No destinations set"}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3 w-3 text-primary" />
                  Travel Dates
                </div>
                <div>
                  <p className="font-semibold text-base text-foreground">
                    {new Date(holidayData.start_date).toLocaleDateString()} -{" "}
                    {new Date(holidayData.end_date).toLocaleDateString()}
                  </p>
                  {holidayData.trip_duration_min && holidayData.trip_duration_max && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {holidayData.trip_duration_min}-{holidayData.trip_duration_max} days
                    </p>
                  )}
                </div>
              </div>
              {holidayData.budget && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <DollarSign className="h-3 w-3 text-primary" />
                    Budget
                  </div>
                  <p className="font-semibold text-base text-foreground">€{holidayData.budget.toLocaleString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Price Tracking Toggle */}
        <div className="mb-6">
          <PriceTrackingToggle
            holidayId={id}
            initialEnabled={holidayData.price_tracking_enabled || false}
            initialLastPrice={holidayData.last_tracked_price || null}
            initialThreshold={holidayData.price_drop_threshold_percent || 10}
            hasFlights={flightData.length > 0}
          />
        </div>

        {needsAiScan && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
                    <Sparkles className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">AI Route Discovery Ready</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Let AI scan the web for the best flight deals matching your criteria
                    </p>
                  </div>
                </div>
                <AiScoutButton holidayId={id} />
              </div>
            </CardContent>
          </Card>
        )}

        {hasAiResults && flightData.length === 0 && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
                    <Plane className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{holidayData.ai_discovery_results?.length} Routes Discovered</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Verify these routes with live flight data from Airhob
                    </p>
                    {holidayData.last_ai_scan && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last scan: {new Date(holidayData.last_ai_scan).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <VerifyFlightsButton holidayId={id} />
              </div>
            </CardContent>
          </Card>
        )}

        {alertData.length > 0 && (
          <Card className="mb-8 border-orange-500/20 bg-orange-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 font-bold text-foreground">
                <TrendingDown className="h-5 w-5 text-orange-500" />
                Recent Price Drops
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alertData.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between text-sm p-3 bg-background/50 rounded-lg">
                    <span className="text-muted-foreground">{new Date(alert.created_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-3">
                      <span className="line-through text-muted-foreground">€{alert.old_price}</span>
                      <span className="font-bold text-orange-600">€{alert.new_price}</span>
                      <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                        -{alert.price_drop_percent.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Flights Section */}
          <div id="flights-section" className="lg:col-span-2">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Flight Options</h2>
                {flightData.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last searched: {getTimeAgo(flightData[0]?.last_checked || flightData[0]?.created_at || "")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <UnifiedFlightSearchButton 
                  holidayId={id} 
                  hasExistingFlights={flightData.length > 0}
                  initialFlightCount={flightData.length}
                />
                {flightData.length > 0 && hasAiResults && <VerifyFlightsButton holidayId={id} variant="outline" />}
              </div>
            </div>

            {flightData.length === 0 ? (
              <Card className="border-dashed border-border bg-secondary/30">
                <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-6 text-muted-foreground animate-float-slow">
                    <Plane className="h-10 w-10" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">No flights found yet</h3>
                  <p className="text-muted-foreground max-w-md leading-relaxed">
                    {holidayData.destinations && holidayData.destinations.length > 0
                      ? "Click 'Search Flights' above to find flights to your destinations"
                      : needsAiScan
                        ? "Run AI discovery to find the best routes"
                        : hasAiResults
                          ? "Verify AI-discovered routes to see live prices"
                          : "Start by running AI discovery or manually adding destinations"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <FlightList flights={flightData} />
            )}
          </div>

          {/* Smart Insights Section */}
          <div>
            <SmartInsightsSection holidayId={id} hasFlights={flightData.length > 0} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
