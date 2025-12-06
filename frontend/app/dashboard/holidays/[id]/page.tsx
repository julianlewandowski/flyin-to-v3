import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, MapPin, DollarSign, Plane, TrendingDown, Sparkles, Edit } from "lucide-react"
import Link from "next/link"
import type { Holiday, Flight, AIInsight, Alert } from "@/lib/types"
import HolidayHeader from "@/components/holiday-header"
import FlightList from "@/components/flight-list"
import GenerateInsightsButton from "@/components/generate-insights-button"
import AiScoutButton from "@/components/ai-scout-button"
import VerifyFlightsButton from "@/components/verify-flights-button"
import UnifiedFlightSearchButton from "@/components/unified-flight-search-button"
import AutoFlightSearch from "@/components/auto-flight-search"

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
  } else {
    console.log(`[Dashboard] Fetched ${flights?.length || 0} flights for holiday ${id}`)
    if (flights && flights.length > 0) {
      console.log("[Dashboard] Sample flight:", {
        id: flights[0].id,
        origin: flights[0].origin,
        destination: flights[0].destination,
        price: flights[0].price,
        deal_url: flights[0].deal_url,
        provider: flights[0].provider,
      })
    }
  }

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
    <div className="min-h-screen bg-gray-100">
      <HolidayHeader userEmail={user.email || ""} />

      {/* Auto-trigger flight search if needed - disabled by default to prevent errors */}
      <AutoFlightSearch
        holidayId={id}
        hasFlights={flightData.length > 0}
        lastSearchDate={flightData.length > 0 ? flightData[0]?.last_checked || flightData[0]?.created_at : null}
        autoSearchEnabled={false}
      />

      {/* Main Content */}
      <main className="container mx-auto px-6 pt-24 pb-16">
        <Link href="/dashboard">
          <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 mb-8 transition-colors duration-300">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </Link>

        {/* Holiday Info */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl md:text-4xl font-bold text-gray-900">{holidayData.name}</CardTitle>
                <CardDescription className="text-gray-600 mt-2">Created on {new Date(holidayData.created_at).toLocaleDateString()}</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {holidayData.use_ai_discovery && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                    <Sparkles className="h-3 w-3" />
                    AI Discovery
                  </Badge>
                )}
                <Link href={`/dashboard/holidays/${id}/edit`}>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <MapPin className="h-4 w-4" />
                  {holidayData.origins && holidayData.origins.length > 1 ? "Origins" : "Origin"}
                </div>
                <p className="font-bold text-lg text-gray-900">
                  {holidayData.origins ? holidayData.origins.join(", ") : holidayData.origin}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <MapPin className="h-4 w-4" />
                  Destinations
                </div>
                <p className="font-bold text-lg text-gray-900">
                  {holidayData.use_ai_discovery && holidayData.destinations.length === 0
                    ? "Flexible (AI)"
                    : holidayData.destinations.join(", ")}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Calendar className="h-4 w-4" />
                  Travel Dates
                </div>
                <p className="font-bold text-gray-900">
                  {new Date(holidayData.start_date).toLocaleDateString()} -{" "}
                  {new Date(holidayData.end_date).toLocaleDateString()}
                </p>
                {holidayData.trip_duration_min && holidayData.trip_duration_max && (
                  <p className="text-sm text-gray-600 mt-1">
                    {holidayData.trip_duration_min}-{holidayData.trip_duration_max} days
                  </p>
                )}
              </div>
              {holidayData.budget && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <DollarSign className="h-4 w-4" />
                    Budget
                  </div>
                  <p className="font-bold text-lg text-gray-900">€{holidayData.budget.toLocaleString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {needsAiScan && (
          <Card className="mb-8 border-blue-500/50 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-sm bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">AI Route Discovery Ready</h3>
                    <p className="text-sm text-gray-700 mt-1">
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
          <Card className="mb-8 border-blue-500/50 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-sm bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Plane className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{holidayData.ai_discovery_results?.length} Routes Discovered</h3>
                    <p className="text-sm text-gray-700 mt-1">
                      Verify these routes with live flight data from Airhob
                    </p>
                    {holidayData.last_ai_scan && (
                      <p className="text-xs text-gray-600 mt-2">
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
              <CardTitle className="text-lg flex items-center gap-2 font-bold text-gray-900">
                <TrendingDown className="h-5 w-5 text-orange-500" />
                Recent Price Drops
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alertData.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{new Date(alert.created_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      <span className="line-through text-gray-500">€{alert.old_price}</span>
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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Flights Section */}
          <div className="lg:col-span-2">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Flight Options</h2>
                {flightData.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
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
              <Card className="border-dashed border-gray-400 bg-gray-200/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="h-16 w-16 rounded-sm bg-gray-300 flex items-center justify-center mb-4">
                    <Plane className="h-8 w-8 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">No flights found yet</h3>
                  <p className="text-gray-700 text-center max-w-md leading-relaxed">
                    {needsAiScan
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

          {/* AI Insights Section */}
          <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">AI Insights</h2>
              <GenerateInsightsButton holidayId={id} />
            </div>

            {insightData.length === 0 ? (
              <Card className="border-dashed border-gray-400 bg-gray-200/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="h-12 w-12 rounded-sm bg-gray-300 flex items-center justify-center mb-4">
                    <TrendingDown className="h-6 w-6 text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-700 text-center leading-relaxed">
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
                        <Badge variant="secondary" className="capitalize bg-blue-500/10 text-blue-600 border-blue-500/20">
                          {insight.insight_type.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-gray-700">{insight.insight_text}</p>
                      <p className="text-xs text-gray-600 mt-3">
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
