import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, MapPin, DollarSign, Plane, TrendingDown } from "lucide-react"
import Link from "next/link"
import type { Holiday, Flight, AIInsight } from "@/lib/types"
import HolidayHeader from "@/components/holiday-header"
import SearchFlightsButton from "@/components/search-flights-button"
import FlightCard from "@/components/flight-card"
import GenerateInsightsButton from "@/components/generate-insights-button"

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
    .order("price", { ascending: true })

  // Fetch AI insights
  const { data: insights } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("holiday_id", id)
    .order("created_at", { ascending: false })

  const holidayData = holiday as Holiday
  const flightData = (flights as Flight[]) || []
  const insightData = (insights as AIInsight[]) || []

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
            <CardTitle className="text-3xl">{holidayData.name}</CardTitle>
            <CardDescription>Created on {new Date(holidayData.created_at).toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <MapPin className="h-4 w-4" />
                  Origin
                </div>
                <p className="font-semibold text-lg">{holidayData.origin}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <MapPin className="h-4 w-4" />
                  Destinations
                </div>
                <p className="font-semibold text-lg">{holidayData.destinations.join(", ")}</p>
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
              </div>
              {holidayData.budget && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    Budget
                  </div>
                  <p className="font-semibold text-lg">${holidayData.budget.toLocaleString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Flights Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Flight Options</h2>
              <SearchFlightsButton holidayId={id} />
            </div>

            {flightData.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Plane className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No flights found yet</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-4">
                    Click "Search Flights" to start tracking prices for this holiday
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
