import Link from "next/link";
import { ArrowLeft, FileText, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <div className="relative pt-32 pb-16 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-background to-blue-50/30" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-orange-200/30 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-float-medium" />
        
        <div className="container mx-auto px-6 relative z-10">
          <Link href="/">
            <Button variant="ghost" className="mb-8 rounded-full hover:bg-white/50 transition-all duration-300">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">Terms of Service</h1>
              <p className="text-muted-foreground mt-1">Last Updated: 30th of November, 2025</p>
            </div>
          </div>
          
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Welcome to Flyin.to ("Flyin.to", "we", "us", or "our"). These Terms of Service ("Terms") govern your access to and use of our website, applications, and services (collectively, the "Service"). By using Flyin.to, you agree to these Terms. If you do not agree, do not use the Service.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 container mx-auto px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-border/50 p-8 md:p-12 space-y-10">
            
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-600 text-sm font-bold">1</span>
                Overview of the Service
              </h2>
              <p className="text-muted-foreground">
                Flyin.to helps travelers discover destinations, compare options, and find affordable flights. We provide travel search, recommendations, and related tools. Flyin.to is not a travel agency, airline, or booking provider. When you click outbound links, you may be redirected to third-party sites where you complete your purchase.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-600 text-sm font-bold">2</span>
                Eligibility
              </h2>
              <p className="text-muted-foreground">
                You must be at least 16 years old to use Flyin.to. By using the Service, you represent that you meet this requirement.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-600 text-sm font-bold">3</span>
                Accounts
              </h2>
              <p className="text-muted-foreground mb-4">
                Some features may require creating an account (e.g., saving trips, syncing preferences).
              </p>
              <p className="text-foreground font-semibold mb-3">You agree to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>Provide accurate information</li>
                <li>Maintain the security of your account</li>
                <li>Notify us of any unauthorized access</li>
              </ul>
              <p className="text-muted-foreground">
                We may suspend or terminate your account if you violate these Terms.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-600 text-sm font-bold">4</span>
                Use of the Service
              </h2>
              <p className="text-foreground font-semibold mb-3">You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>Use the Service for unlawful, misleading, or harmful purposes</li>
                <li>Attempt to scrape, crawl, or extract data without permission</li>
                <li>Interfere with the Service's security or functionality</li>
                <li>Reverse engineer or copy our systems, algorithms, or UI</li>
              </ul>
              <p className="text-muted-foreground">
                We may update, suspend, or discontinue parts of the Service at any time.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-600 text-sm font-bold">5</span>
                Third-Party Links & Services
              </h2>
              <p className="text-muted-foreground mb-4">
                Flyin.to contains links to third-party providers (e.g., airlines, hotels, booking platforms).
              </p>
              <p className="text-foreground font-semibold mb-3">We do not:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>Control or endorse these third parties</li>
                <li>Guarantee accuracy of pricing or availability</li>
                <li>Handle payments, refunds, cancellations, or support for purchases made elsewhere</li>
              </ul>
              <p className="text-muted-foreground">
                Your interactions with third-party services are governed by their terms and policies.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-600 text-sm font-bold">6</span>
                Intellectual Property
              </h2>
              <p className="text-muted-foreground">
                All content on Flyin.to—design, logos, text, data, software, recommendations—belongs to Flyin.to or our licensors. You may not use our content without permission.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-600 text-sm font-bold">7</span>
                Disclaimers
              </h2>
              <p className="text-muted-foreground mb-4">
                Flyin.to is provided "as is" and "as available."
              </p>
              <p className="text-foreground font-semibold mb-3">We do not guarantee:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>Accuracy or completeness of flight data</li>
                <li>Real-time pricing</li>
                <li>That the Service will be uninterrupted or error-free</li>
              </ul>
              <p className="text-muted-foreground bg-orange-50 p-4 rounded-xl border border-orange-100">
                Travel data is subject to change, availability, and third-party control.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-600 text-sm font-bold">8</span>
                Limitation of Liability
              </h2>
              <p className="text-muted-foreground mb-4">
                To the maximum extent permitted by law, Flyin.to is not liable for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>Any indirect or consequential damages</li>
                <li>Loss of data, revenue, or profits</li>
                <li>Issues arising from third-party sites</li>
                <li>Travel-related events, cancellations, or disputes</li>
              </ul>
              <p className="text-muted-foreground">
                Your sole remedy is to discontinue using the Service.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-600 text-sm font-bold">9</span>
                Changes to These Terms
              </h2>
              <p className="text-muted-foreground">
                We may modify these Terms at any time. The updated version will be posted with a revised "Last Updated" date. Continued use of the Service means you accept the changes.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-600 text-sm font-bold">10</span>
                Governing Law
              </h2>
              <p className="text-muted-foreground">
                These Terms are governed by the laws of the Republic of Ireland, excluding conflict-of-law principles.
              </p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-600 text-sm font-bold">11</span>
                Contact
              </h2>
              <p className="text-muted-foreground mb-4">For questions about these Terms, contact us at:</p>
              <a 
                href="mailto:support@flyin.to" 
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-full font-medium hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-300"
              >
                <Mail className="h-4 w-4" />
                support@flyin.to
              </a>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
