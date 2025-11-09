"use client"

import Link from "next/link"

export default function PrivacyPage() {
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

      {/* Privacy Policy Content */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Effective Date: November 2025 | Website: TextHume.com | Contact: texthume@gmail.com</p>

        <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p>
              TextHume ("we," "our," or "us") provides an AI-powered text-humanizing platform that transforms robotic or AI-generated writing into more natural, human-sounding content. This Privacy Policy explains how we collect, use, and protect your information when you use our website and related services (collectively, the "Service"). By creating an account or using TextHume, you agree to this Privacy Policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
            <p>We collect the following types of information:</p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">a. Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> When you sign up, we collect your email address, and password (hashed and encrypted).</li>
              <li><strong>Usage Data:</strong> We track word usage (e.g., your 500-word free allowance or monthly quota) to manage plan limits.</li>
              <li><strong>Payment Information:</strong> Payments and subscriptions are processed securely through Stripe. We do not store full credit-card details on our servers.</li>
              <li><strong>Text Inputs:</strong> Any text you submit into the humanizer is temporarily processed by a third-party AI model to generate your output. We do not store or use text inputs for AI training</li>
              <li><strong>Support & Feedback:</strong> When you contact us via email or form, we may store your message to respond to your request.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">b. Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Analytics:</strong> We use Google Analytics 4 (GA4) to understand site usage (page views, session length, device type, etc.). GA4 may collect anonymized identifiers such as cookies and truncated IP addresses.</li>
              <li><strong>Technical Data:</strong> Your browser type, operating system, and time of access may be logged for performance and security monitoring.</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Operate, maintain, and improve the Service.</li>
              <li>Authenticate users and manage subscriptions.</li>
              <li>Track plan usage and enforce word quotas.</li>
              <li>Process payments and issue invoices.</li>
              <li>Respond to support requests.</li>
              <li>Analyze usage trends through analytics tools.</li>
              <li>Detect and prevent spam, abuse, or fraud.</li>
            </ul>
            <p className="mt-3">We will never sell or rent your personal data.</p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account data (email, plan type, usage stats) are kept while your account is active.</li>
              <li>If you delete your account, personal data are removed within 30 days, except where retention is required for billing or legal purposes.</li>
              <li>Text inputs are stored only temporarily to generate results.</li>
            </ul>
          </section>

          {/* Data Sharing and Third Parties */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Sharing and Third Parties</h2>
            <p>
              We may share limited information with:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Stripe (for billing and payments).</li>
              <li>Anthropic PBC (Claude API provider, for text processing).</li>
              <li>Google Analytics (for analytics and site performance).</li>
            </ul>
            <p className="mt-3">
              Each provider has its own independent privacy policy governing its data handling. We may also disclose data when required by law or to protect our rights and users.
            </p>
          </section>

          {/* Cookies and Tracking */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies and Tracking</h2>
            <p>
              TextHume uses cookies and similar technologies to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintain login sessions.</li>
              <li>Measure anonymous analytics data.</li>
            </ul>
            <p className="mt-3">
              You can manage or disable cookies in your browser, but certain features may not function correctly.
            </p>
          </section>

          {/* Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Security</h2>
            <p>
              We use HTTPS encryption and follow modern security best practices. Passwords are hashed and never stored in plain text. However, no online system is 100% secure, and we cannot guarantee absolute protection.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Your Rights</h2>
            <p>
              Depending on your jurisdiction, you may:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access, correct, or delete your data.</li>
              <li>Opt out of analytics tracking. Requests can be sent to texthume@gmail.com.</li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
            <p>
              Our Service is not intended for anyone under 13. We do not knowingly collect data from minors.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. The "Effective Date" will be updated, and continued use of the Service constitutes acceptance of the revised version.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact</h2>
            <p>
              For any privacy questions or requests:
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
