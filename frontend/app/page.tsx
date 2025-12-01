import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeaturesShowcase } from "@/components/features-showcase"
import { TimelineFlow } from "@/components/timeline-flow"
import { AboutSection } from "@/components/about-section"
import { WaitlistSection } from "@/components/waitlist-section"
import { Footer } from "@/components/footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-100 antialiased">
      <Header />
      <main className="relative">
        <HeroSection />
        <FeaturesShowcase />
        <TimelineFlow />
        <AboutSection />
        <WaitlistSection />
      </main>
      <Footer />
    </div>
  )
}
