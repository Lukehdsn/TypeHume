"use client"

import Link from "next/link"

export default function ContactPage() {
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

      {/* Contact Content */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Get in Touch</h1>
        <p className="text-lg text-gray-600 mb-12">
          Have a question or feedback about TextHume? We'd love to hear from you.
        </p>

        <div className="bg-gradient-to-br from-[#7B7EFF]/10 to-[#7B7EFF]/5 border border-[#7B7EFF]/20 rounded-2xl p-12">
          <div className="text-center">
            <p className="text-gray-700 mb-6 text-lg">
              Send us an email and we'll get back to you as soon as possible.
            </p>

            <a
              href="mailto:texthume@gmail.com"
              className="inline-block bg-[#7B7EFF] text-white hover:bg-[#6B6EDF] rounded-xl px-8 py-4 font-semibold transition-colors text-lg"
            >
              Email: texthume@gmail.com
            </a>

            <p className="text-gray-500 mt-8 text-sm">
              We typically respond within 24 hours.
            </p>
          </div>
        </div>

        <div className="mt-16 pt-12 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Other ways to reach us</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              <strong>General inquiries:</strong> Contact us at <a href="mailto:texthume@gmail.com" className="text-[#7B7EFF] hover:underline">texthume@gmail.com</a>
            </p>
            <p>
              <strong>Support:</strong> For account or billing issues, visit your <Link href="/app/profile" className="text-[#7B7EFF] hover:underline">account settings</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 mt-20 border-t border-gray-800">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-bold text-[#7B7EFF]">TH</span>
                <span className="text-xl font-semibold text-white">TextHume</span>
              </div>
              <p className="text-sm">Transform AI text into human-like content instantly.</p>
            </div>

            <div>
              <ul className="space-y-2 text-sm">
                <li><Link href="/pricing" className="hover:text-[#7B7EFF] transition-colors">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-[#7B7EFF] transition-colors">Privacy Policy</Link></li>
                <li><a href="#" className="hover:text-[#7B7EFF] transition-colors">Terms Of Service</a></li>
              </ul>
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
