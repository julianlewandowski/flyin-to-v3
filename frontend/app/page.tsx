import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeaturesShowcase } from "@/components/features-showcase"
import { TimelineFlow } from "@/components/timeline-flow"
import { AboutSection } from "@/components/about-section"
import { Footer } from "@/components/footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background antialiased overflow-x-hidden">
      <Header />
      <main className="relative">
        <HeroSection />
        <FeaturesShowcase />
        <TimelineFlow />
        <AboutSection />
      </main>
      <Footer />
    </div>
  )
}
