"use client"

import Link from "next/link"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#7B7EFF]">TH</span>
            <span className="text-2xl font-semibold text-gray-900">TextHume</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              Home
            </Link>
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
              Pricing
            </Link>
            <Link href="/contact" className="text-gray-600 hover:text-gray-900">
              Contact
            </Link>
          </div>
        </div>
      </nav>

      {/* Terms Content */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-600 mb-8">Effective Date: November 2025 | Website: texthume.com | Contact: texthume@gmail.com</p>

        <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p>
              Welcome to TextHume, an AI-powered writing tool that humanizes AI-generated or robotic text. By creating an account or using our website and services (the "Service"), you agree to comply with these Terms of Service ("Terms"). If you do not agree, please do not use the Service.
            </p>
          </section>

          {/* Eligibility and Accounts */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Eligibility and Accounts</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must be at least 13 years old to create an account.</li>
              <li>You agree to provide accurate information and keep your login credentials secure.</li>
              <li>You are responsible for all activity under your account.</li>
              <li>You may delete your account at any time by contacting texthume@gmail.com.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these Terms or abuse the platform.</li>
            </ul>
          </section>

          {/* Free Plan and Usage Limits */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Free Plan and Usage Limits</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>New users receive 500 free words upon signup.</li>
              <li>After that, usage requires an active paid plan (Starter, Pro, Premium).</li>
              <li>Abuse of free credits (multiple accounts, bots, or scraping) may result in account suspension.</li>
            </ul>
          </section>

          {/* Subscriptions and Payments */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Subscriptions and Payments</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>All payments are handled securely by Stripe.</li>
              <li>Plans are available as monthly or annual subscriptions.</li>
              <li>Subscriptions automatically renew unless canceled before the next billing cycle.</li>
              <li>You can manage or cancel your plan in your account settings.</li>
              <li>Refunds may be issued at our discretion in exceptional cases.</li>
              <li>Failure to complete payment may result in temporary suspension of access.</li>
            </ul>
          </section>

          {/* AI Processing and Output */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. AI Processing and Output</h2>
            <p>
              TextHume uses third-party artificial intelligence (AI) models to process your text and generate humanized outputs. We make no guarantee that outputs will always be undetectable by AI checkers or suitable for academic or professional submission. You are responsible for reviewing and using generated content appropriately.
            </p>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Intellectual Property</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You retain ownership of your text inputs and AI-generated outputs.</li>
              <li>By using the Service, you grant us a limited license to process your data for the purpose of providing the Service.</li>
            </ul>
          </section>

          {/* Fair Use and Restrictions */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Fair Use and Restrictions</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Attempt to reverse engineer, copy, or resell TextHume.</li>
              <li>Exceed your plan's monthly word limits.</li>
              <li>Use the Service to generate unlawful, defamatory, or misleading content.</li>
            </ul>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Termination</h2>
            <p>
              We may suspend or terminate accounts that violate these Terms or misuse the platform. Upon termination or account deletion, all data (except required billing records) will be removed within 30 days.
            </p>
          </section>

          {/* Disclaimers and Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Disclaimers and Limitation of Liability</h2>
            <p>
              TextHume is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free service. To the fullest extent permitted by law, TextHume and its operators shall not be liable for any indirect, incidental, or consequential damages resulting from your use or inability to use the Service.
            </p>
          </section>

          {/* Modifications */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Modifications</h2>
            <p>
              We may modify these Terms at any time. Changes take effect upon posting on this page, and continued use signifies acceptance.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the State of Texas, USA, without regard to conflict-of-law principles.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact</h2>
            <p>
              For questions about these Terms or billing:
            </p>
            <p className="mt-3">
              📩 <a href="mailto:texthume@gmail.com" className="text-[#7B7EFF] hover:underline">texthume@gmail.com</a>
            </p>
          </section>
        </div>

      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 mt-20 border-t border-gray-800">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex flex-col items-center gap-8 mb-8">
            <div className="text-center">
              <div className="flex items-center gap-2 mb-4 justify-center">
                <span className="text-2xl font-bold text-[#7B7EFF]">TH</span>
                <span className="text-xl font-semibold text-white">TextHume</span>
              </div>
              <p className="text-sm">Transform AI text into human-like content instantly.</p>
            </div>

            <div className="flex gap-6 text-sm">
              <Link href="/pricing" className="hover:text-[#7B7EFF] transition-colors">Pricing</Link>
              <Link href="/privacy" className="hover:text-[#7B7EFF] transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-[#7B7EFF] transition-colors">Terms Of Service</Link>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-8 text-center text-sm">
            <p>&copy; 2024 TextHume. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
