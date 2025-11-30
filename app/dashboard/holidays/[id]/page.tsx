import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, MapPin, DollarSign, Plane, TrendingDown, Sparkles } from "lucide-react"
import Link from "next/link"
import type { Holiday, Flight, AIInsight, Alert } from "@/lib/types"
import HolidayHeader from "@/components/holiday-header"
import FlightCard from "@/components/flight-card"
import GenerateInsightsButton from "@/components/generate-insights-button"
import AiScoutButton from "@/components/ai-scout-button"
import VerifyFlightsButton from "@/components/verify-flights-button"
import UnifiedFlightSearchButton from "@/components/unified-flight-search-button"

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
  const { data: flights } = await supabase
    .from("flights")
    .select("*")
    .eq("holiday_id", id)
    .order("last_checked", { ascending: false })
    .order("price", { ascending: true })

  // Fetch AI insights
  const { data: insights } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("holiday_id", id)
    .order("created_at", { ascending: false })

  // Fetch alerts
  const { data: alerts } = await supabase
    .from("alerts")
    .select("*")
    .eq("holiday_id", id)
    .order("created_at", { ascending: false })
    .limit(5)

  const holidayData = holiday as Holiday
  const flightData = (flights as Flight[]) || []
  const insightData = (insights as AIInsight[]) || []
  const alertData = (alerts as Alert[]) || []

  const needsAiScan = holidayData.use_ai_discovery && !holidayData.ai_discovery_results
  const hasAiResults = holidayData.ai_discovery_results && holidayData.ai_discovery_results.length > 0

  return (
    <div className="min-h-screen bg-background">
      <HolidayHeader userEmail={user.email || ""} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Link href="/dashboard">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </Link>

        {/* Holiday Info */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl">{holidayData.name}</CardTitle>
                <CardDescription>Created on {new Date(holidayData.created_at).toLocaleDateString()}</CardDescription>
              </div>
              {holidayData.use_ai_discovery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Discovery
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <MapPin className="h-4 w-4" />
                  {holidayData.origins && holidayData.origins.length > 1 ? "Origins" : "Origin"}
                </div>
                <p className="font-semibold text-lg">
                  {holidayData.origins ? holidayData.origins.join(", ") : holidayData.origin}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <MapPin className="h-4 w-4" />
                  Destinations
                </div>
                <p className="font-semibold text-lg">
                  {holidayData.use_ai_discovery && holidayData.destinations.length === 0
                    ? "Flexible (AI)"
                    : holidayData.destinations.join(", ")}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  Travel Dates
                </div>
                <p className="font-semibold">
                  {new Date(holidayData.start_date).toLocaleDateString()} -{" "}
                  {new Date(holidayData.end_date).toLocaleDateString()}
                </p>
                {holidayData.trip_duration_min && holidayData.trip_duration_max && (
                  <p className="text-sm text-muted-foreground">
                    {holidayData.trip_duration_min}-{holidayData.trip_duration_max} days
                  </p>
                )}
              </div>
              {holidayData.budget && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    Budget
                  </div>
                  <p className="font-semibold text-lg">€{holidayData.budget.toLocaleString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {needsAiScan && (
          <Card className="mb-8 border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Route Discovery Ready</h3>
                    <p className="text-sm text-muted-foreground">
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
          <Card className="mb-8 border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plane className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{holidayData.ai_discovery_results?.length} Routes Discovered</h3>
                    <p className="text-sm text-muted-foreground">
                      Verify these routes with live flight data from Airhob
                    </p>
                    {holidayData.last_ai_scan && (
                      <p className="text-xs text-muted-foreground mt-1">
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
          <Card className="mb-8 border-orange-500/50 bg-orange-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-500" />
                Recent Price Drops
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alertData.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{new Date(alert.created_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      <span className="line-through text-muted-foreground">€{alert.old_price}</span>
                      <span className="font-semibold text-orange-500">€{alert.new_price}</span>
                      <Badge variant="secondary" className="text-orange-500">
                        -{alert.price_drop_percent.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Flights Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">Flight Options</h2>
                {flightData.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Last searched: {getTimeAgo(flightData[0]?.last_checked || flightData[0]?.created_at || "")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <UnifiedFlightSearchButton holidayId={id} hasExistingFlights={flightData.length > 0} />
                {flightData.length > 0 && hasAiResults && <VerifyFlightsButton holidayId={id} variant="outline" />}
              </div>
            </div>

            {flightData.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Plane className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No flights found yet</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-4">
                    {needsAiScan
                      ? "Run AI discovery to find the best routes"
                      : hasAiResults
                        ? "Verify AI-discovered routes to see live prices"
                        : "Start by running AI discovery or manually adding destinations"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {flightData.map((flight) => (
                  <FlightCard key={flight.id} flight={flight} />
                ))}
              </div>
            )}
          </div>

          {/* AI Insights Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">AI Insights</h2>
              {flightData.length > 0 && <GenerateInsightsButton holidayId={id} />}
            </div>

            {insightData.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                    <TrendingDown className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    {flightData.length === 0
                      ? "AI insights will appear here once we have flight data"
                      : "Click 'Generate AI Insights' to get personalized recommendations"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {insightData.map((insight) => (
                  <Card key={insight.id}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {insight.insight_type.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed">{insight.insight_text}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(insight.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
