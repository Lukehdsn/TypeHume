"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth, useUser } from "@clerk/nextjs"
import { supabase } from "@/lib/supabase"
import { PlanType } from "@/lib/plans"

const features = {
  free: [
    "500 words/month",
    "250 words per request",
    "Basic quality",
    "Copy & export"
  ],
  starter: [
    "5,000 words/month",
    "500 words per request",
    "Standard quality",
    "Copy & export"
  ],
  pro: [
    "20,000 words/month",
    "1,500 words per request",
    "Advanced quality",
    "Priority speed",
    "Early access to features"
  ],
  premium: [
    "50,000 words/month",
    "3,000 words per request",
    "Premium quality",
    "Priority support",
    "Custom integrations"
  ]
}

export default function PricingPage() {
  const { userId } = useAuth()
  const { user } = useUser()
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly")
  const [wordLimit, setWordLimit] = useState(500)
  const [wordsUsed, setWordsUsed] = useState(0)
  const [currentPlan, setCurrentPlan] = useState<PlanType>("free")
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch user's word data if authenticated
  useEffect(() => {
    if (!userId) return

    const fetchUserData = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("plan, word_limit, words_used")
          .eq("id", userId)
          .maybeSingle()

        if (error) {
          console.error("Error fetching user data - detailed:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            fullError: error
          })
          return
        }

        if (data) {
          setCurrentPlan((data.plan as PlanType) || "free")
          setWordLimit(data.word_limit)
          setWordsUsed(data.words_used)
        }
      } catch (err) {
        console.error("Error fetching user data:", err)
      }
    }

    fetchUserData()
  }, [userId])

  const handleCheckout = async (plan: PlanType) => {
    if (!userId) {
      // Redirect to sign up if not authenticated
      window.location.href = `/sign-up?plan=${plan}`
      return
    }

    setError(null)
    setSuccessMessage(null)
    setCheckoutLoading(plan)

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          billingPeriod,
          userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to start checkout")
        setCheckoutLoading(null)
        return
      }

      // Redirect to Stripe checkout
      window.location.href = data.sessionUrl
    } catch (error) {
      console.error("Checkout error:", error)
      setError("Failed to start checkout. Please try again.")
      setCheckoutLoading(null)
    }
  }

  const handleUpgrade = async (plan: PlanType) => {
    if (!userId) {
      window.location.href = `/sign-up?plan=${plan}`
      return
    }

    setError(null)
    setSuccessMessage(null)
    setCheckoutLoading(plan)

    try {
      const response = await fetch("/api/upgrade-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      })

      const data = await response.json()

      if (!response.ok) {
        // If they need checkout instead (no existing subscription)
        if (data.needsCheckout) {
          await handleCheckout(plan)
          return
        }
        setError(data.error || "Failed to upgrade plan")
        setCheckoutLoading(null)
        return
      }

      // Success! Show message and reload
      setSuccessMessage(`Successfully upgraded to ${data.plan} plan!`)
      setCheckoutLoading(null)
      // Reload after brief delay to let user see success message
      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      console.error("Upgrade error:", error)
      setError("Failed to upgrade. Please try again.")
      setCheckoutLoading(null)
    }
  }

  const handlePlanClick = (plan: PlanType) => {
    // If user already has this plan, don't do anything
    if (currentPlan === plan) return

    // Always use checkout for all plan upgrades
    handleCheckout(plan)
  }

  const starterPrice = billingPeriod === "monthly" ? 4.99 : 3
  const proPrice = billingPeriod === "monthly" ? 14.99 : 8
  const premiumPrice = billingPeriod === "monthly" ? 38.99 : 20
  const savingsPercent = billingPeriod === "annual" ? "47" : null
  const wordsRemaining = Math.max(0, wordLimit - wordsUsed)
  const userInitial = user?.primaryEmailAddress?.emailAddress
    ?.charAt(0)
    .toUpperCase() || "U"

  return (
    <div className="min-h-screen bg-white">
      {/* Dotted Background Grid */}
      <div className="absolute inset-0 [background-image:radial-gradient(theme(colors.gray.200)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Content */}
      <div className="relative">
        {/* Navbar */}
        <nav className="border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
            <Link href={userId ? "/app" : "/"} className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[#7B7EFF]">TH</span>
              <span className="text-2xl font-semibold text-gray-900">TextHume</span>
            </Link>

            <div className="flex items-center gap-3">
              {userId ? (
                // Authenticated navbar
                <>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Words remaining</p>
                    <p className="text-lg font-bold text-[#7B7EFF]">{wordsRemaining}</p>
                  </div>
                  <Link
                    href="/pricing"
                    className="bg-[#7B7EFF] text-white hover:brightness-110 rounded-lg px-4 py-2 transition-all text-sm font-medium"
                  >
                    Get more words
                  </Link>
                  <Link href="/app/profile" className="w-10 h-10 rounded-full bg-[#7B7EFF] text-white flex items-center justify-center font-bold text-sm cursor-pointer hover:brightness-110 transition-all" title={user?.primaryEmailAddress?.emailAddress}>
                    {userInitial}
                  </Link>
                </>
              ) : (
                // Unauthenticated navbar
                <>
                  <Link href="/sign-in" className="text-gray-700 hover:text-gray-900 transition-colors">log in</Link>
                  <Link href="/sign-up" className="bg-[#7B7EFF] text-white hover:brightness-110 rounded-lg px-4 py-2 transition-all">
                    Start Writing
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 py-20 text-center">
          {/* Error Notification */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <div className="text-red-600 font-bold text-lg">⚠</div>
              <div className="text-left">
                <p className="font-medium text-red-900">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          )}

          {/* Success Notification */}
          {successMessage && (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <div className="text-green-600 font-bold text-lg">✓</div>
              <div className="text-left">
                <p className="font-medium text-green-900">{successMessage}</p>
                <p className="text-sm text-green-700">Redirecting in a moment...</p>
              </div>
            </div>
          )}

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            No credit card required. Cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-16">
            <div className="inline-flex rounded-full border border-gray-200 p-1 bg-white shadow-sm">
              <button
                onClick={() => setBillingPeriod("monthly")}
                aria-pressed={billingPeriod === "monthly"}
                className={`px-8 py-3 rounded-full font-medium transition-all duration-200 ${
                  billingPeriod === "monthly"
                    ? "bg-[#7B7EFF] text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                aria-pressed={billingPeriod === "annual"}
                className={`px-8 py-3 rounded-full font-medium transition-all duration-200 ${
                  billingPeriod === "annual"
                    ? "bg-[#7B7EFF] text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Annual
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-24">
            {/* Free Card */}
            <div className={`relative rounded-2xl border bg-white p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col ${userId && currentPlan === "free" ? "border-[#7B7EFF] border-2" : "border-gray-200"}`}>
              {userId && currentPlan === "free" && (
                <div className="absolute top-4 right-4 inline-block">
                  <span
                    className="inline-block px-3 py-1 text-xs font-semibold rounded-full"
                    style={{ background: "rgba(123, 126, 255, 0.1)", color: "#7B7EFF" }}
                  >
                    Current Plan
                  </span>
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
                <div className="flex items-baseline gap-2 justify-center">
                  <span className="text-4xl font-bold text-gray-900">$0</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">Forever free</p>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8 flex-grow">
                {features.free.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ background: "#7B7EFF" }}
                    />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Button */}
              <button
                onClick={() => {
                  if (!userId) {
                    window.location.href = "/sign-up"
                    return
                  }
                  window.location.href = "/app"
                }}
                className="block w-full bg-gray-900 text-white hover:bg-gray-800 rounded-xl px-4 py-3 text-center font-medium transition-colors"
              >
                Start for free
              </button>
            </div>

            {/* Starter Card */}
            <div className={`relative rounded-2xl border bg-white p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col ${currentPlan === "starter" ? "border-[#7B7EFF] border-2" : "border-gray-200"}`}>
              {currentPlan === "starter" && (
                <div className="absolute top-4 right-4 inline-block">
                  <span
                    className="inline-block px-3 py-1 text-xs font-semibold rounded-full"
                    style={{ background: "rgba(123, 126, 255, 0.1)", color: "#7B7EFF" }}
                  >
                    Current Plan
                  </span>
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                <div className="flex items-baseline gap-2 justify-center">
                  <span className="text-4xl font-bold text-gray-900">${starterPrice}</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {billingPeriod === "annual" ? "Billed annually (Save ~40%)" : "Billed monthly"}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8 flex-grow">
                {features.starter.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ background: "#7B7EFF" }}
                    />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Button */}
              {currentPlan === "starter" ? (
                <div className="bg-gray-100 text-gray-600 rounded-xl px-4 py-3 text-center font-medium cursor-not-allowed">
                  Current Plan
                </div>
              ) : (
                <button
                  onClick={() => handlePlanClick("starter")}
                  disabled={checkoutLoading === "starter"}
                  className="block bg-gray-900 text-white hover:bg-gray-800 rounded-xl px-4 py-3 text-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
                >
                  {checkoutLoading === "starter" ? "Processing..." : "Upgrade to Starter"}
                </button>
              )}
            </div>

            {/* Pro Card - Most Popular */}
            <div className={`relative rounded-2xl border-2 bg-white p-8 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col ${currentPlan === "pro" ? "border-[#7B7EFF]" : "border-[#7B7EFF]/60"}`}>
              {/* Most Popular/Current Plan Badge */}
              {currentPlan !== "premium" && (
                <div className="absolute top-6 left-6 inline-block">
                  <span
                    className="inline-block px-3 py-1 text-xs font-semibold rounded-full"
                    style={{ background: "rgba(123, 126, 255, 0.1)", color: "#7B7EFF" }}
                  >
                    {currentPlan === "pro" ? "Current Plan" : "Most popular"}
                  </span>
                </div>
              )}

              <div className="mb-8 pt-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
                <div className="flex items-baseline gap-2 justify-center">
                  <span className="text-4xl font-bold text-gray-900">${proPrice}</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {billingPeriod === "annual" ? `Billed annually (Save ~${savingsPercent}%)` : "Billed monthly"}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8 flex-grow">
                {features.pro.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ background: "#7B7EFF" }}
                    />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Button */}
              {currentPlan === "pro" ? (
                <div className="bg-gray-100 text-gray-600 rounded-xl px-4 py-3 text-center font-medium cursor-not-allowed">
                  Current Plan
                </div>
              ) : (
                <button
                  onClick={() => handlePlanClick("pro")}
                  disabled={checkoutLoading === "pro"}
                  className="block bg-[#7B7EFF] text-white hover:brightness-110 rounded-xl px-4 py-3 text-center font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full"
                >
                  {checkoutLoading === "pro" ? "Processing..." : "Upgrade to Pro"}
                </button>
              )}
            </div>

            {/* Premium Card */}
            <div className={`relative rounded-2xl border bg-white p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col ${currentPlan === "premium" ? "border-[#7B7EFF] border-2" : "border-gray-200"}`}>
              {currentPlan === "premium" && (
                <div className="absolute top-4 right-4 inline-block">
                  <span
                    className="inline-block px-3 py-1 text-xs font-semibold rounded-full"
                    style={{ background: "rgba(123, 126, 255, 0.1)", color: "#7B7EFF" }}
                  >
                    Current Plan
                  </span>
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium</h3>
                <div className="flex items-baseline gap-2 justify-center">
                  <span className="text-4xl font-bold text-gray-900">${premiumPrice}</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {billingPeriod === "annual" ? "Billed annually (Save ~49%)" : "Billed monthly"}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8 flex-grow">
                {features.premium.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ background: "#7B7EFF" }}
                    />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Button */}
              {currentPlan === "premium" ? (
                <div className="bg-gray-100 text-gray-600 rounded-xl px-4 py-3 text-center font-medium cursor-not-allowed">
                  Current Plan
                </div>
              ) : (
                <button
                  onClick={() => handlePlanClick("premium")}
                  disabled={checkoutLoading === "premium"}
                  className="block bg-gray-900 text-white hover:bg-gray-800 rounded-xl px-4 py-3 text-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
                >
                  {checkoutLoading === "premium" ? "Processing..." : "Upgrade to Premium"}
                </button>
              )}
            </div>
          </div>

          {/* Trust Line */}
          <div className="text-center mt-12 pt-12 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              30-day money-back guarantee. Cancel anytime.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300 mt-20">
          <div className="max-w-5xl mx-auto px-6 py-12">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl font-bold text-[#7B7EFF]">TH</span>
                  <span className="text-xl font-semibold text-white">TextHume</span>
                </div>
                <p className="text-sm">Transform AI text into human-like content instantly.</p>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-4">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/" className="hover:text-[#7B7EFF] transition-colors">Home</Link></li>
                  <li><Link href="/pricing" className="hover:text-[#7B7EFF] transition-colors">Pricing</Link></li>
                  <li><a href="#" className="hover:text-[#7B7EFF] transition-colors">API</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-4">Company</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-[#7B7EFF] transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-[#7B7EFF] transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-[#7B7EFF] transition-colors">Contact</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-4">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-[#7B7EFF] transition-colors">Privacy</a></li>
                  <li><a href="#" className="hover:text-[#7B7EFF] transition-colors">Terms</a></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-8 text-center text-sm">
              <p>&copy; 2024 TextHume. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
