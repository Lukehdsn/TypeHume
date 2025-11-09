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
          </div>
        </div>
      </nav>

      {/* Privacy Policy Content */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: November 2024</p>

        <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
            <p>
              TextHume ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and otherwise process your personal information when you use our website, mobile application, and related services (collectively, the "Service").
            </p>
          </section>

          {/* Key Services & AI Disclosure */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Important: AI-Powered Service & Third-Party Processing</h2>
            <p>
              TextHume uses <strong>Claude AI (developed by Anthropic)</strong> to humanize text that you submit. When you use our Service:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Your text is sent to Anthropic's Claude AI:</strong> We send the text you submit to Anthropic's servers for processing by their Claude language model.</li>
              <li><strong>Anthropic's Privacy Policy applies:</strong> Anthropic may use your input data according to their privacy policy at https://www.anthropic.com/privacy</li>
              <li><strong>Data retention:</strong> We retain your input and output text in our database for your records and to track word usage.</li>
              <li><strong>No AI training:</strong> We request that Anthropic does not use your data to train future AI models.</li>
            </ul>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Information We Collect</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Account Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email address</li>
              <li>Name</li>
              <li>Profile information</li>
              <li>Account preferences</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Usage Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Text you submit for humanization</li>
              <li>Humanized output text</li>
              <li>Word count usage and subscription plan information</li>
              <li>Interaction data (features used, frequency)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Payment Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Billing address</li>
              <li>Payment method (processed by Stripe - we don't store credit card data)</li>
              <li>Purchase history and subscription details</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Device & Access Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Access logs and timestamps</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process text through Claude AI for humanization</li>
              <li>Manage your account and subscription</li>
              <li>Process payments through Stripe</li>
              <li>Send service-related announcements and support messages</li>
              <li>Monitor and analyze Service usage and trends</li>
              <li>Detect and prevent fraud or security issues</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Services</h2>
            <p>
              We use several third-party services to operate TextHume. These services may process your personal information according to their own privacy policies:
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Anthropic (Claude AI)</h3>
            <p>
              <strong>Purpose:</strong> AI-powered text humanization
            </p>
            <p>
              <strong>Data processed:</strong> Text you submit for humanization
            </p>
            <p>
              <strong>Privacy Policy:</strong> https://www.anthropic.com/privacy
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Stripe</h3>
            <p>
              <strong>Purpose:</strong> Payment processing and subscription management
            </p>
            <p>
              <strong>Data processed:</strong> Billing address, payment method, purchase history
            </p>
            <p>
              <strong>Privacy Policy:</strong> https://stripe.com/privacy
            </p>
            <p className="text-sm text-gray-600">
              Note: Credit card data is never stored by us or transmitted to our servers. Stripe handles all payment processing.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Supabase</h3>
            <p>
              <strong>Purpose:</strong> Data storage and database management
            </p>
            <p>
              <strong>Data processed:</strong> Account information, usage history, humanization records
            </p>
            <p>
              <strong>Privacy Policy:</strong> https://supabase.com/privacy
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">Clerk</h3>
            <p>
              <strong>Purpose:</strong> User authentication and account management
            </p>
            <p>
              <strong>Data processed:</strong> Email address, name, authentication credentials
            </p>
            <p>
              <strong>Privacy Policy:</strong> https://clerk.com/privacy
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account data:</strong> Retained while your account is active. Deleted upon account deletion.</li>
              <li><strong>Humanization history:</strong> Retained for your reference and word usage tracking. Deleted when you delete your account.</li>
              <li><strong>Payment records:</strong> Retained as required by law for tax and legal purposes.</li>
              <li><strong>Log data:</strong> Retained for up to 90 days for security purposes.</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights</h2>
            <p>
              Depending on your location, you may have rights regarding your personal information, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> You can view your account information and humanization history anytime</li>
              <li><strong>Deletion:</strong> You can request deletion of your account and all associated data</li>
              <li><strong>Data portability:</strong> You can export your data</li>
              <li><strong>Opt-out:</strong> You can disable marketing communications</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us at <a href="mailto:support@texthumeee.vercel.app" className="text-[#7B7EFF] hover:underline">support@texthumeee.vercel.app</a>
            </p>
          </section>

          {/* Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Security</h2>
            <p>
              We use industry-standard security measures to protect your information, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>HTTPS encryption for all data in transit</li>
              <li>Secure authentication through Clerk</li>
              <li>Database encryption through Supabase</li>
              <li>Regular security monitoring</li>
            </ul>
            <p className="mt-4">
              While we implement reasonable security measures, no system is completely secure. We cannot guarantee absolute security of your information.
            </p>
          </section>

          {/* Account Deletion */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Deletion & GDPR Compliance</h2>
            <p>
              When you delete your account:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your account and personal information are deleted from our database</li>
              <li>Your humanization history is deleted</li>
              <li>Any active subscription is cancelled (no refunds for partial months)</li>
              <li>You remain responsible for any charges already incurred</li>
            </ul>
            <p className="mt-4">
              We maintain only transaction records required by law. Your deletion request is processed in accordance with GDPR and similar privacy regulations.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by updating the "Last updated" date and posting the new version on this page.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="font-semibold">TextHume</p>
              <p>Email: <a href="mailto:support@texthumeee.vercel.app" className="text-[#7B7EFF] hover:underline">support@texthumeee.vercel.app</a></p>
            </div>
          </section>

          {/* Disclaimer */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Legal Disclaimer</h2>
            <p className="text-sm text-gray-600">
              This privacy policy is provided as-is for a solo proprietor business. It covers the main privacy practices of TextHume. As our business grows and our revenue increases, we plan to have this policy reviewed and updated by a lawyer to ensure full legal compliance. We recommend reviewing Anthropic, Stripe, Supabase, and Clerk's privacy policies as well, since they are responsible for their own data handling practices.
            </p>
          </section>
        </div>

        {/* Footer Link */}
        <div className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-600">
          <Link href="/" className="text-[#7B7EFF] hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
