import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plane, Calendar, DollarSign, Sparkles, TrendingDown, Bell } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">Flyin.to</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Sign up</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-balance mb-6">
            Find the Best Flight Deals for Your Next Adventure
          </h1>
          <p className="text-xl text-muted-foreground text-balance mb-8 leading-relaxed">
            Track prices across multiple destinations, get AI-powered insights, and never miss a deal. Perfect for
            flexible travelers who want to maximize their budget.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/sign-up">
              <Button size="lg" className="text-lg px-8">
                Start Tracking Flights
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent">
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-secondary py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Find Great Deals</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed for budget-savvy travelers with flexible plans
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Flexible Date Search</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Search across date ranges to find the cheapest days to fly. Perfect when your schedule is flexible.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingDown className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Multi-Destination Tracking</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Track prices to multiple destinations at once. Compare and choose the best deal for your budget.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Auto Price Tracking</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Set it and forget it. We automatically check prices and notify you when deals appear.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI-Powered Insights</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Get smart recommendations on the best time to book and alternative destinations to save more.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <DollarSign className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Budget Management</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Set your budget and see only flights that fit. No more wasting time on options you can't afford.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Plane className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Direct Booking Links</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Found a great deal? Book instantly with direct links to airlines and booking platforms.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Save on Your Next Trip?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of travelers who are finding better deals with Flyin.to
          </p>
          <Link href="/auth/sign-up">
            <Button size="lg" className="text-lg px-8">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Flyin.to. Built for flexible travelers.</p>
        </div>
      </footer>
    </div>
  )
}
