import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <div className="bg-gray-200 rounded-sm shadow-sm border border-gray-300 p-8 md:p-12">
          <h1 className="text-4xl font-bold mb-2 text-gray-900">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last Updated: 30th of November, 2025</p>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-700 mb-8">
              This Privacy Policy explains how Flyin.to ("Flyin.to", "we", "us") collects, uses, and protects your information. By using our Service, you agree to the practices described here.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">1. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">1.1 Information You Provide</h3>
              <p className="text-gray-700 mb-4">We may collect:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                <li>Email address (for account creation or notifications)</li>
                <li>Saved searches, preferences, and trip details</li>
                <li>Messages you send to our support team</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">1.2 Information Collected Automatically</h3>
              <p className="text-gray-700 mb-4">When you use Flyin.to, we automatically collect:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                <li>Device and browser information</li>
                <li>IP address and approximate location</li>
                <li>Usage data (pages visited, searches performed, interaction timestamps)</li>
                <li>Cookies and similar technologies</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-gray-800 mt-6">1.3 Third-Party Data</h3>
              <p className="text-gray-700 mb-4">
                If you sign in via Google or another provider, we receive basic profile info (name, email, avatar) as permitted by your settings.
              </p>
              <p className="text-gray-700 mb-4">
                We do not receive your payment information; purchases occur on third-party websites outside our control.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">2. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use your information to:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                <li>Operate and improve Flyin.to</li>
                <li>Personalize travel suggestions</li>
                <li>Save your searches, trips, and preferences</li>
                <li>Send optional updates or notifications</li>
                <li>Detect fraud or misuse</li>
                <li>Analyze trends and performance</li>
              </ul>
              <p className="text-gray-700 font-semibold">We never sell your personal data.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">3. Cookies & Tracking</h2>
              <p className="text-gray-700 mb-4">Flyin.to uses cookies and similar technologies to:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                <li>Maintain your session</li>
                <li>Understand usage and analytics</li>
                <li>Improve recommendations</li>
                <li>Enable sign-in functionality</li>
              </ul>
              <p className="text-gray-700">You can manage cookies in your browser settings.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">4. How We Share Information</h2>
              <p className="text-gray-700 mb-4">We may share limited information with:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                <li>Service providers (analytics tools, hosting, authentication partners)</li>
                <li>Third-party travel sites you visit via outbound links (they may know you arrived from Flyin.to, but we do not send them your personal data)</li>
                <li>Legal authorities when required to comply with law or protect rights</li>
              </ul>
              <p className="text-gray-700 font-semibold">We never sell personal information to advertisers.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">5. Data Retention</h2>
              <p className="text-gray-700 mb-4">We retain your data only as long as necessary to:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                <li>Provide the Service</li>
                <li>Fulfill legitimate business or legal obligations</li>
              </ul>
              <p className="text-gray-700">You may delete your account at any time to remove stored personal data.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">6. Your Rights</h2>
              <p className="text-gray-700 mb-4">Depending on your jurisdiction, you may have rights to:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                <li>Access your data</li>
                <li>Correct or update information</li>
                <li>Request deletion</li>
                <li>Opt out of certain processing</li>
                <li>Export your data</li>
              </ul>
              <p className="text-gray-700">
                To exercise these rights, contact <a href="mailto:support@flyin.to" className="text-orange-500 hover:underline">support@flyin.to</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">7. Security</h2>
              <p className="text-gray-700">
                We implement reasonable security measures to protect your information, but no online system is completely secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">8. Children's Privacy</h2>
              <p className="text-gray-700">
                Flyin.to is not intended for children under 16. We do not knowingly collect data from minors.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">9. International Transfers</h2>
              <p className="text-gray-700">
                If you are located outside our hosting region, your data may be transferred to servers in other countries with different data protection laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">10. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time. The updated version will include the "Last Updated" date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">11. Contact</h2>
              <p className="text-gray-700">
                For privacy questions or requests: <a href="mailto:support@flyin.to" className="text-orange-500 hover:underline">support@flyin.to</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

