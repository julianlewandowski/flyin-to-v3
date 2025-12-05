import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfServicePage() {
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
          <h1 className="text-4xl font-bold mb-2 text-gray-900">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last Updated: 30th of November, 2025</p>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-700 mb-8">
              Welcome to Flyin.to ("Flyin.to", "we", "us", or "our"). These Terms of Service ("Terms") govern your access to and use of our website, applications, and services (collectively, the "Service"). By using Flyin.to, you agree to these Terms. If you do not agree, do not use the Service.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">1. Overview of the Service</h2>
              <p className="text-gray-700 mb-4">
                Flyin.to helps travelers discover destinations, compare options, and find affordable flights. We provide travel search, recommendations, and related tools. Flyin.to is not a travel agency, airline, or booking provider. When you click outbound links, you may be redirected to third-party sites where you complete your purchase.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">2. Eligibility</h2>
              <p className="text-gray-700">
                You must be at least 16 years old to use Flyin.to. By using the Service, you represent that you meet this requirement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">3. Accounts</h2>
              <p className="text-gray-700 mb-4">
                Some features may require creating an account (e.g., saving trips, syncing preferences).
              </p>
              <p className="text-gray-700 mb-4 font-semibold">You agree to:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                <li>Provide accurate information</li>
                <li>Maintain the security of your account</li>
                <li>Notify us of any unauthorized access</li>
              </ul>
              <p className="text-gray-700">
                We may suspend or terminate your account if you violate these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">4. Use of the Service</h2>
              <p className="text-gray-700 mb-4 font-semibold">You agree not to:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                <li>Use the Service for unlawful, misleading, or harmful purposes</li>
                <li>Attempt to scrape, crawl, or extract data without permission</li>
                <li>Interfere with the Service's security or functionality</li>
                <li>Reverse engineer or copy our systems, algorithms, or UI</li>
              </ul>
              <p className="text-gray-700">
                We may update, suspend, or discontinue parts of the Service at any time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">5. Third-Party Links & Services</h2>
              <p className="text-gray-700 mb-4">
                Flyin.to contains links to third-party providers (e.g., airlines, hotels, booking platforms).
              </p>
              <p className="text-gray-700 mb-4 font-semibold">We do not:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                <li>Control or endorse these third parties</li>
                <li>Guarantee accuracy of pricing or availability</li>
                <li>Handle payments, refunds, cancellations, or support for purchases made elsewhere</li>
              </ul>
              <p className="text-gray-700">
                Your interactions with third-party services are governed by their terms and policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">6. Intellectual Property</h2>
              <p className="text-gray-700">
                All content on Flyin.to—design, logos, text, data, software, recommendations—belongs to Flyin.to or our licensors. You may not use our content without permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">7. Disclaimers</h2>
              <p className="text-gray-700 mb-4">
                Flyin.to is provided "as is" and "as available."
              </p>
              <p className="text-gray-700 mb-4 font-semibold">We do not guarantee:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                <li>Accuracy or completeness of flight data</li>
                <li>Real-time pricing</li>
                <li>That the Service will be uninterrupted or error-free</li>
              </ul>
              <p className="text-gray-700">
                Travel data is subject to change, availability, and third-party control.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">8. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                To the maximum extent permitted by law, Flyin.to is not liable for:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700">
                <li>Any indirect or consequential damages</li>
                <li>Loss of data, revenue, or profits</li>
                <li>Issues arising from third-party sites</li>
                <li>Travel-related events, cancellations, or disputes</li>
              </ul>
              <p className="text-gray-700">
                Your sole remedy is to discontinue using the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">9. Changes to These Terms</h2>
              <p className="text-gray-700">
                We may modify these Terms at any time. The updated version will be posted with a revised "Last Updated" date. Continued use of the Service means you accept the changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">10. Governing Law</h2>
              <p className="text-gray-700">
                These Terms are governed by the laws of the Republic of Ireland, excluding conflict-of-law principles.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">11. Contact</h2>
              <p className="text-gray-700">
                For questions about these Terms, contact us at: <a href="mailto:support@flyin.to" className="text-orange-500 hover:underline">support@flyin.to</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

