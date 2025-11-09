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
        <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">Get in Touch</h1>
        <p className="text-lg text-gray-600 mb-12 text-center">
          Have a question or feedback about TextHume?<br />
          We'd love to hear from you.
        </p>

        <div className="max-w-lg mx-auto group relative border border-gray-200 rounded-2xl bg-white p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center">
          {/* Icon Container */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-8 h-8 text-[#7B7EFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          {/* Content */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Send us an email</h3>
          <p className="text-sm text-gray-600 mb-6">
            We'd love to hear from you. Send us a message and we'll get back to you as soon as possible.
          </p>

          {/* Email Button */}
          <a
            href="mailto:texthume@gmail.com"
            className="inline-block bg-[#7B7EFF] text-white hover:brightness-110 rounded-xl px-6 py-3 font-semibold transition-all text-sm mb-4"
          >
            Email: texthume@gmail.com
          </a>

          {/* Response Time */}
          <p className="text-gray-500 text-xs">
            Typically responds within 24 hours
          </p>
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
              <a href="#" className="hover:text-[#7B7EFF] transition-colors">Terms Of Service</a>
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
