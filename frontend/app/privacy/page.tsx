import Link from "next/link";
import { ArrowLeft, Shield, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <div className="relative pt-32 pb-16 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-background to-orange-50/30" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl animate-float-medium" />
        
        <div className="container mx-auto px-6 relative z-10">
          <Link href="/">
            <Button variant="ghost" className="mb-8 rounded-full hover:bg-white/50 transition-all duration-300">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">Privacy Policy</h1>
              <p className="text-muted-foreground mt-1">Last Updated: 30th of November, 2025</p>
            </div>
          </div>
          
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            This Privacy Policy explains how Flyin.to ("Flyin.to", "we", "us") collects, uses, and protects your information. By using our Service, you agree to the practices described here.
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
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">1</span>
                Information We Collect
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">1.1 Information You Provide</h3>
                  <p className="text-muted-foreground mb-3">We may collect:</p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Email address (for account creation or notifications)</li>
                    <li>Saved searches, preferences, and trip details</li>
                    <li>Messages you send to our support team</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">1.2 Information Collected Automatically</h3>
                  <p className="text-muted-foreground mb-3">When you use Flyin.to, we automatically collect:</p>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Device and browser information</li>
                    <li>IP address and approximate location</li>
                    <li>Usage data (pages visited, searches performed, interaction timestamps)</li>
                    <li>Cookies and similar technologies</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">1.3 Third-Party Data</h3>
                  <p className="text-muted-foreground mb-3">
                    If you sign in via Google or another provider, we receive basic profile info (name, email, avatar) as permitted by your settings.
                  </p>
                  <p className="text-muted-foreground">
                    We do not receive your payment information; purchases occur on third-party websites outside our control.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">2</span>
                How We Use Your Information
              </h2>
              <p className="text-muted-foreground mb-3">We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>Operate and improve Flyin.to</li>
                <li>Personalize travel suggestions</li>
                <li>Save your searches, trips, and preferences</li>
                <li>Send optional updates or notifications</li>
                <li>Detect fraud or misuse</li>
                <li>Analyze trends and performance</li>
              </ul>
              <p className="text-foreground font-semibold bg-blue-50 p-4 rounded-xl border border-blue-100">
                We never sell your personal data.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">3</span>
                Cookies & Tracking
              </h2>
              <p className="text-muted-foreground mb-3">Flyin.to uses cookies and similar technologies to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>Maintain your session</li>
                <li>Understand usage and analytics</li>
                <li>Improve recommendations</li>
                <li>Enable sign-in functionality</li>
              </ul>
              <p className="text-muted-foreground">You can manage cookies in your browser settings.</p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">4</span>
                How We Share Information
              </h2>
              <p className="text-muted-foreground mb-3">We may share limited information with:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>Service providers (analytics tools, hosting, authentication partners)</li>
                <li>Third-party travel sites you visit via outbound links (they may know you arrived from Flyin.to, but we do not send them your personal data)</li>
                <li>Legal authorities when required to comply with law or protect rights</li>
              </ul>
              <p className="text-foreground font-semibold bg-blue-50 p-4 rounded-xl border border-blue-100">
                We never sell personal information to advertisers.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">5</span>
                Data Retention
              </h2>
              <p className="text-muted-foreground mb-3">We retain your data only as long as necessary to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>Provide the Service</li>
                <li>Fulfill legitimate business or legal obligations</li>
              </ul>
              <p className="text-muted-foreground">You may delete your account at any time to remove stored personal data.</p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">6</span>
                Your Rights
              </h2>
              <p className="text-muted-foreground mb-3">Depending on your jurisdiction, you may have rights to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>Access your data</li>
                <li>Correct or update information</li>
                <li>Request deletion</li>
                <li>Opt out of certain processing</li>
                <li>Export your data</li>
              </ul>
              <p className="text-muted-foreground">
                To exercise these rights, contact{" "}
                <a href="mailto:support@flyin.to" className="text-primary hover:underline font-medium">
                  support@flyin.to
                </a>.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">7</span>
                Security
              </h2>
              <p className="text-muted-foreground">
                We implement reasonable security measures to protect your information, but no online system is completely secure.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">8</span>
                Children's Privacy
              </h2>
              <p className="text-muted-foreground">
                Flyin.to is not intended for children under 16. We do not knowingly collect data from minors.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">9</span>
                International Transfers
              </h2>
              <p className="text-muted-foreground">
                If you are located outside our hosting region, your data may be transferred to servers in other countries with different data protection laws.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">10</span>
                Changes to This Policy
              </h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. The updated version will include the "Last Updated" date.
              </p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">11</span>
                Contact
              </h2>
              <p className="text-muted-foreground mb-4">For privacy questions or requests:</p>
              <a 
                href="mailto:support@flyin.to" 
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-full font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
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
