"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Clipboard } from "lucide-react"
import { useAuth } from "@clerk/nextjs"
import { humanizeLocal } from "@/lib/humanize"
import DetectorMarquee from "@/components/DetectorMarquee"

interface SavedSession {
  input: string
  output: string
  timestamp: number
}

export default function Home() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const panelRef = useRef<HTMLDivElement>(null)
  const { userId } = useAuth()

  // Load from localStorage on mount - only for authenticated users
  useEffect(() => {
    if (!userId) {
      // Clear localStorage for non-authenticated users
      localStorage.removeItem("texthume:last")
      return
    }

    const saved = localStorage.getItem("texthume:last")
    if (saved) {
      try {
        const { input: savedInput, output: savedOutput } = JSON.parse(saved)
        setInput(savedInput || "")
        setOutput(savedOutput || "")
      } catch (err) {
        console.error("Failed to load saved session:", err)
      }
    }
  }, [userId])

  // Save to localStorage whenever input or output changes - only for authenticated users
  useEffect(() => {
    // Only save to localStorage if user is authenticated
    if (!userId) {
      return
    }

    if (input || output) {
      const session: SavedSession = {
        input,
        output,
        timestamp: Date.now(),
      }
      localStorage.setItem("texthume:last", JSON.stringify(session))
    }
  }, [input, output, userId])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value.slice(0, 500)
    setInput(text)
    setError("")
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const combined = input + text
      const sliced = combined.slice(0, 500)
      setInput(sliced)
      setError("")
    } catch (err) {
      setError("Failed to paste. Please check clipboard permissions.")
      console.error("Paste error:", err)
    }
  }

  const handleHumanize = async () => {
    if (!userId) {
      window.location.href = "/sign-up"
      return
    }

    if (!input.trim()) {
      setError("Please enter some text to humanize.")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Simulate API delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 500))
      const result = humanizeLocal(input)
      setOutput(result)
    } catch (err) {
      setError("Failed to humanize text. Please try again.")
      console.error("Humanize error:", err)
    } finally {
      setLoading(false)
    }
  }

  const scrollToPanel = () => {
    if (!userId) {
      window.location.href = "/sign-up"
      return
    }
    panelRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Count words instead of characters
  const wordCount = input.trim() === "" ? 0 : input.trim().split(/\s+/).length
  const wordLimit = 500
  const isAlmostFull = wordCount >= 450
  const isFull = wordCount >= wordLimit

  // Color for word counter
  let counterColor = "text-gray-600"
  if (isFull) {
    counterColor = "text-red-600"
  } else if (isAlmostFull) {
    counterColor = "text-amber-600"
  }

  // Prevent exceeding word limit
  const handleWordLimitChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length

    if (words <= wordLimit) {
      handleInputChange(e)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav>
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          {/* Left Section - Logo + Navigation Links */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-accent">TH</span>
              <span className="text-2xl font-semibold text-text">TextHume</span>
            </div>

            {/* Navigation Links */}
            <div className="hidden sm:flex gap-8">
              <Link
                href="/pricing"
                className="text-gray-900 hover:text-accent transition-colors"
              >
                Pricing
              </Link>
              <a
                href="#about"
                className="text-gray-900 hover:text-accent transition-colors"
              >
                About
              </a>
            </div>
          </div>

          {/* Right Section - Buttons */}
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="btn-secondary">log in</Link>
            <Link href="/sign-up" className="btn-primary">Start Writing</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 mt-12 mb-12 md:mt-20 md:mb-16 text-center">
        <h1 className="text-[36px] md:text-[56px] font-bold tracking-tight leading-[1.1] text-gray-900">
          Meet Your Fast, Reliable
          <br />
          Text Humanizer
        </h1>

        <p className="text-lg md:text-xl text-gray-600 mt-3">
          Turn robotic AI writing into natural, human-like text in seconds
        </p>

        <button onClick={scrollToPanel} className="mx-auto block px-8 py-4 text-lg font-semibold bg-[#7B7EFF] text-white rounded-xl hover:shadow-[0_0_20px_4px_rgba(123,126,255,0.4)] transition-all duration-200 mt-10">
          Start Writing <span className="text-white/60">– it's free</span>
        </button>

        {/* Social Proof */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <div className="flex -space-x-2">
            <img
              src="https://i.pravatar.cc/32?img=1"
              alt="User 1"
              className="w-8 h-8 rounded-full border-2 border-white"
            />
            <img
              src="https://i.pravatar.cc/32?img=2"
              alt="User 2"
              className="w-8 h-8 rounded-full border-2 border-white"
            />
            <img
              src="https://i.pravatar.cc/32?img=3"
              alt="User 3"
              className="w-8 h-8 rounded-full border-2 border-white"
            />
          </div>
          <p className="text-sm text-gray-500">Loved by over 2 million users</p>
        </div>
      </section>

      {/* Humanizer Panel */}
      <section
        ref={panelRef}
        className="mt-16 mb-16 max-w-5xl mx-auto px-6 rounded-2xl border border-[#7B7EFF]/40 shadow-sm overflow-hidden"
      >
        <div className="flex flex-col md:flex-row bg-white">
          {/* Left Column - Input */}
          <div className="flex-1 flex flex-col relative min-h-[480px]">
            {/* Textarea - fills entire column */}
            <textarea
              value={input}
              onChange={handleWordLimitChange}
              placeholder="Enter or paste AI writing here..."
              className="flex-1 w-full p-6 outline-none resize-none border-0 focus:outline-none transition-colors pr-12"
            />

            {/* Clear Button - Trash Bin */}
            {input.length > 0 && (
              <button
                onClick={() => {
                  setInput("")
                  setOutput("")
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 2a1 1 0 0 0 0 2h.01a1 1 0 0 0 0-2H9z" />
                  <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2h2a1 1 0 0 1 0 2h-1.581l-.621 9.328A2 2 0 0 1 16.864 20H7.137a2 2 0 0 1-1.995-1.872L4.58 9H3a1 1 0 0 1 0-2h2V5zm2 4h12v9a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9z" />
                </svg>
              </button>
            )}

            {/* Paste Button - centered in middle of textarea, hidden when text exists */}
            {input.length === 0 && (
              <button
                onClick={handlePaste}
                className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 rounded-full border border-accent text-accent hover:bg-accent/5 transition-colors"
              >
                <Clipboard size={18} />
                Paste Text
              </button>
            )}

            {/* Bottom Bar - Counter and Button */}
            <div className="px-6 pb-6 flex items-center justify-between">
              <span className={`text-sm font-medium ${counterColor}`}>
                {wordCount}/500
              </span>
              <button
                onClick={handleHumanize}
                disabled={!input.trim() || loading}
                className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Humanizing..." : "Humanize"}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-600 px-6 pb-3">{error}</p>
            )}
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-[#7B7EFF]/40" />

          {/* Right Column - Output */}
          <div className="flex-1 flex flex-col p-6 md:pl-3 min-h-[480px]">
            {!output ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 text-center">
                  Your humanized text will appear here…
                </p>
              </div>
            ) : (
              <div
                className="transition-opacity duration-300 opacity-100 flex flex-col justify-between h-full"
                aria-live="polite"
              >
                <div className="prose prose-sm max-w-none break-words">
                  <p className="text-gray-900 leading-relaxed whitespace-pre-wrap break-words">
                    {output}
                  </p>
                </div>

                {/* Button Group */}
                <div className="flex gap-2 self-end">
                  <button
                    onClick={() => {
                      setOutput("")
                    }}
                    className="btn-secondary text-sm"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(output)
                    }}
                    className="btn-primary text-sm"
                  >
                    Copy Text
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* AI Detector Section */}
      <section className="max-w-5xl mx-auto px-6 mt-16 mb-16 text-center">
        <h3 className="text-lg font-semibold text-gray-600 mb-6">
          Become undetectable and bypass major AI detections
        </h3>
        <DetectorMarquee />
      </section>

      {/* How TextHume Works - SideShift Style */}
      <section className="relative py-20 overflow-hidden">
        {/* Dotted Grid Background */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(203, 213, 225, 0.6) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How TextHume Works
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              See how TextHume transforms robotic AI text into natural writing in four simple steps
            </p>
          </div>

          {/* Process Flow Container */}
          <div className="relative">
            {/* Curved SVG Line - Hidden on Mobile, Visible on Desktop */}
            <svg
              className="hidden lg:block absolute top-24 left-0 w-full h-32 pointer-events-none"
              viewBox="0 0 1200 140"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M 50 110 C 300 40, 900 40, 1150 110"
                stroke="#7B7EFF"
                strokeWidth="2"
                strokeDasharray="8 8"
                opacity="0.3"
                fill="none"
              />
            </svg>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">

              {/* Step 1: Paste Text */}
              <div className="relative flex flex-col">
                <div className="group relative bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 w-full">
                  {/* Numbered Badge - Top Right */}
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                    1
                  </div>

                  <div className="flex flex-col items-center text-center">
                    {/* Icon Container */}
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Paste Text
                    </h3>
                    <p className="text-sm text-gray-600">
                      Enter your AI-generated content into the text box
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Click Humanize */}
              <div className="relative flex flex-col">
                <div className="group relative bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 w-full">
                  {/* Numbered Badge - Top Right */}
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                    2
                  </div>

                  <div className="flex flex-col items-center text-center">
                    {/* Icon Container */}
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Click Humanize
                    </h3>
                    <p className="text-sm text-gray-600">
                      Our AI transforms robotic text into natural writing
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3: AI Check */}
              <div className="relative flex flex-col">
                <div className="group relative bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 w-full">
                  {/* Numbered Badge - Top Right */}
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                    3
                  </div>

                  <div className="flex flex-col items-center text-center">
                    {/* Icon Container */}
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      AI Check
                    </h3>
                    <p className="text-sm text-gray-600">
                      Verify your text passes all major AI detectors
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4: Copy & Use */}
              <div className="relative flex flex-col">
                <div className="group relative bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 w-full">
                  {/* Numbered Badge - Top Right */}
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                    4
                  </div>

                  <div className="flex flex-col items-center text-center">
                    {/* Icon Container */}
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Copy & Use
                    </h3>
                    <p className="text-sm text-gray-600">
                      Copy your humanized text and use it anywhere
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Why TextHume Works in Practice Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Dotted Grid Background */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(203, 213, 225, 0.6) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why TextHume Works in Practice
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Built for real writing, tested against real checks
            </p>
          </div>

          {/* Two-Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Card 1: Detection-Resilient Optimization */}
            <div className="group relative bg-white rounded-2xl p-10 border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              {/* Gradient Blob - Top Left */}
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br from-purple-200 to-indigo-200 rounded-full opacity-20 blur-3xl group-hover:opacity-30 transition-opacity duration-300" />

              <div className="relative z-10">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Detection-Resilient Optimization
                </h3>
                <p className="text-base text-gray-600 mb-5">
                  Our model is refined through repeated cross-platform testing and data-driven calibration so your writing reads naturally to both people and screening tools.
                </p>

                {/* Bullet Points */}
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                    <span className="text-base text-gray-700">Adaptive length & variance control</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                    <span className="text-base text-gray-700">Preserves tone and intent</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                    <span className="text-base text-gray-700">Benchmark-tested across multiple detectors</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 2: How Our Humanizer Helps */}
            <div className="group relative bg-white rounded-2xl p-10 border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              {/* Gradient Blob - Bottom Right */}
              <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full opacity-20 blur-3xl group-hover:opacity-30 transition-opacity duration-300" />

              <div className="relative z-10">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  How Our Humanizer Helps
                </h3>
                <p className="text-base text-gray-600 mb-5">
                  We refine AI-generated text for any context — academic, professional, or creative — turning robotic phrasing into clear, human-sounding language.
                </p>

                {/* Bullet Points */}
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                    <span className="text-base text-gray-700">Enhances credibility & readability</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                    <span className="text-base text-gray-700">Adapts tone for resumes, essays, and posts</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                    <span className="text-base text-gray-700">Trusted by students, creators & businesses</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Dotted Grid Background */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(203, 213, 225, 0.6) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              What Writers Say About TextHume
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Real feedback from students, creators, and professionals using TextHume daily
            </p>
          </div>

          {/* Testimonial Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Testimonial 1: Freelance Copywriter */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-4.5-5-7-5S0 3.75 0 5c0 5 0 7 3 9m0 0c-1 .667-2.333 1.333-4 2m14-8v10c0 1-1 2-2 2s-4.5-1.5-6-2c-1.667 1-2.333 2-4 2m14 0v-10c0-4 7-6 7-6s1.5 0 4 2m-3 6c-1-.333-4-1-7-2" />
                </svg>
              </div>
              <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                "TextHume saves me hours when I need to polish AI-written client copy. It makes my writing sound natural without losing the tone I want."
              </p>
              <div className="border-t border-gray-100 pt-4">
                <p className="font-semibold text-gray-900 text-sm">Lara M.</p>
                <p className="text-xs text-gray-600">Freelance Copywriter</p>
              </div>
            </div>

            {/* Testimonial 2: Graduate Student */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-4.5-5-7-5S0 3.75 0 5c0 5 0 7 3 9m0 0c-1 .667-2.333 1.333-4 2m14-8v10c0 1-1 2-2 2s-4.5-1.5-6-2c-1.667 1-2.333 2-4 2m14 0v-10c0-4 7-6 7-6s1.5 0 4 2m-3 6c-1-.333-4-1-7-2" />
                </svg>
              </div>
              <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                "I use TextHume to rewrite AI drafts for my research papers. It keeps everything original and readable — my professors can't tell it started with AI."
              </p>
              <div className="border-t border-gray-100 pt-4">
                <p className="font-semibold text-gray-900 text-sm">Dylan T.</p>
                <p className="text-xs text-gray-600">Master's Student</p>
              </div>
            </div>

            {/* Testimonial 3: Content Creator */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-4.5-5-7-5S0 3.75 0 5c0 5 0 7 3 9m0 0c-1 .667-2.333 1.333-4 2m14-8v10c0 1-1 2-2 2s-4.5-1.5-6-2c-1.667 1-2.333 2-4 2m14 0v-10c0-4 7-6 7-6s1.5 0 4 2m-3 6c-1-.333-4-1-7-2" />
                </svg>
              </div>
              <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                "I used to spend forever editing captions from ChatGPT to sound more human. Now I just run them through TextHume and they're ready to post."
              </p>
              <div className="border-t border-gray-100 pt-4">
                <p className="font-semibold text-gray-900 text-sm">Janelle K.</p>
                <p className="text-xs text-gray-600">TikTok Creator</p>
              </div>
            </div>

            {/* Testimonial 4: SEO Blogger */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-4.5-5-7-5S0 3.75 0 5c0 5 0 7 3 9m0 0c-1 .667-2.333 1.333-4 2m14-8v10c0 1-1 2-2 2s-4.5-1.5-6-2c-1.667 1-2.333 2-4 2m14 0v-10c0-4 7-6 7-6s1.5 0 4 2m-3 6c-1-.333-4-1-7-2" />
                </svg>
              </div>
              <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                "TextHume keeps my blog content sounding fresh while passing all AI detectors. It's a must-have for long-form SEO writing."
              </p>
              <div className="border-t border-gray-100 pt-4">
                <p className="font-semibold text-gray-900 text-sm">Ella R.</p>
                <p className="text-xs text-gray-600">Blog Writer</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <FAQAccordion />

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 mt-20">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-bold text-accent">TH</span>
                <span className="text-xl font-semibold text-white">TextHume</span>
              </div>
              <p className="text-sm">Transform AI text into human-like content instantly.</p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-accent transition-colors">Features</a></li>
                <li><Link href="/pricing" className="hover:text-accent transition-colors">Pricing</Link></li>
                <li><a href="#" className="hover:text-accent transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#about" className="hover:text-accent transition-colors">About</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-accent transition-colors">Privacy</Link></li>
                <li><a href="#" className="hover:text-accent transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Security</a></li>
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

function FAQAccordion() {
  const [openItems, setOpenItems] = useState<number[]>([])

  const faqs = [
    {
      id: 1,
      question: "How accurate is the humanization?",
      answer: "Our proprietary rewriting model transforms AI-generated text into natural, human-like language that reads authentically and performs well across common AI detectors, including ZeroGPT, GPTZero, Turnitin, and Copyleaks."
    },
    {
      id: 2,
      question: "Will my text stay private?",
      answer: "Yes. Your text is processed securely in your browser — nothing is stored, logged, or shared with any third parties."
    },
    {
      id: 3,
      question: "Can I use TextHume for academic writing?",
      answer: "Absolutely. TextHume is designed to improve clarity, tone, and readability in essays or reports. Please follow your institution's integrity policies when submitting AI-assisted work."
    },
    {
      id: 4,
      question: "Does it work for professional content too?",
      answer: "Yes — professionals use TextHume daily to refine emails, reports, and proposals. It adapts your tone for corporate, academic, or casual communication automatically."
    },
    {
      id: 5,
      question: "Can I humanize long documents or entire reports?",
      answer: "Yes. TextHume supports large inputs (up to several pages at a time). For very long docs, humanize in sections to maintain tone consistency."
    },
    {
      id: 6,
      question: "Is there a free version?",
      answer: "Yes. Try TextHume for free with limited daily credits — no signup or card required. Upgrade anytime for unlimited access and faster processing."
    },
    {
      id: 7,
      question: "What makes TextHume different from regular AI rewriters?",
      answer: "Unlike standard paraphrasers, TextHume focuses on removing AI-style signals while keeping your meaning intact—optimizing variance, rhythm, and syntax for natural flow."
    },
    {
      id: 8,
      question: "Do you offer refunds or cancellations?",
      answer: "Yes — all Pro plans come with a 30-day money-back guarantee. Cancel anytime."
    }
  ]

  const toggleItem = (id: number) => {
    setOpenItems(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  return (
    <section className="max-w-3xl mx-auto px-6 py-20 bg-gradient-to-b from-white to-[#f9f9ff] rounded-3xl">
      <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Your questions, answered</h2>

      <div className="space-y-4">
        {faqs.map(faq => (
          <div
            key={faq.id}
            className="border border-gray-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <button
              onClick={() => toggleItem(faq.id)}
              aria-expanded={openItems.includes(faq.id)}
              aria-controls={`faq-content-${faq.id}`}
              className="w-full flex items-center justify-between px-6 py-5 hover:ring-1 hover:ring-[#7B7EFF]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B7EFF]/30 transition-all duration-200"
            >
              <h3 className="text-left text-[1.05rem] font-medium text-gray-900">
                {faq.question}
              </h3>
              <svg
                className={`flex-shrink-0 w-5 h-5 text-accent transition-transform duration-300 ${
                  openItems.includes(faq.id) ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>

            {openItems.includes(faq.id) && (
              <div
                id={`faq-content-${faq.id}`}
                className="px-6 pb-5 text-[0.95rem] text-gray-600 leading-relaxed border-t border-gray-200 animate-in fade-in slide-in-from-top-2"
              >
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
