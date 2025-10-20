import { Button } from "@/components/ui/button"
import { Plane } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url(/placeholder.svg?height=1080&width=1920&query=airplane+flying+in+sky+sunset+clouds)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100/40 via-transparent to-white/60" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary/90 flex items-center justify-center">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-foreground">Flyin.to</span>
            <span className="text-sm text-muted-foreground ml-1">AI Flight Deal Tracker & Toolkit</span>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-32 pb-20 md:pt-48 md:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-balance mb-4">Where are you</h1>
            <h1 className="text-5xl md:text-7xl font-bold text-primary mb-6">Flyin.to</h1>
            <h2 className="text-3xl md:text-5xl font-bold text-balance mb-8">today?</h2>

            <p className="text-lg md:text-xl text-foreground/90 text-balance mb-4 leading-relaxed">
              The smartest way to find flight deals. Customise your holiday and we'll scan for the best prices every
              day.
            </p>

            <p className="text-sm text-muted-foreground mb-8">
              ✈️ The new flight deal tracker for students and budget travellers with flexibility
            </p>

            <Link href="/auth/sign-up">
              <Button size="lg" className="text-lg px-8 shadow-lg">
                <Plane className="mr-2 h-5 w-5" />
                Join the Waitlist
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
