"use client"

import { useUser, useAuth } from "@clerk/nextjs"
import { SignOutButton, UserProfile } from "@clerk/nextjs"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { getPlanConfig, PlanType } from "@/lib/plans"

export default function ProfilePage() {
  const { user } = useUser()
  const { userId } = useAuth()
  const [plan, setPlan] = useState<PlanType>("free")
  const [wordLimit, setWordLimit] = useState(500)
  const [wordsUsed, setWordsUsed] = useState(0)
  const [maxPerRequest, setMaxPerRequest] = useState(250)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showAccountSettings, setShowAccountSettings] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [subscriptionPeriodEnd, setSubscriptionPeriodEnd] = useState<string | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  const fetchUserData = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    try {
      const response = await fetch("/api/user/fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("Error fetching user data:", data)
        setLoading(false)
        return
      }

      if (data.user) {
        const userPlan = (data.user.plan as PlanType) || "free"
        setPlan(userPlan)
        setWordLimit(data.user.word_limit || 500)
        setWordsUsed(data.user.words_used || 0)
        setMaxPerRequest(getPlanConfig(userPlan).maxWordsPerRequest)
        setSubscriptionStatus(data.user.subscription_status || null)
        setSubscriptionPeriodEnd(data.user.subscription_period_end || null)
      }
      setLoading(false)
    } catch (err) {
      console.error("Error:", err)
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  const handleOpenBillingPortal = async () => {
    setPortalLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/billing-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to open billing portal")
        setPortalLoading(false)
        return
      }

      // Redirect to Stripe billing portal
      window.location.href = data.portalUrl
    } catch (err) {
      console.error("Portal error:", err)
      setError("Failed to open billing portal. Please try again.")
      setPortalLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You'll keep access until your billing period ends.")) {
      return
    }

    setCancelLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to cancel subscription")
        setCancelLoading(false)
        return
      }

      // Update UI with cancellation status
      setSubscriptionStatus("canceling")
      setSubscriptionPeriodEnd(data.periodEnd)
      setSuccessMessage(data.message || "Subscription cancelled successfully!")
      setCancelLoading(false)
    } catch (err) {
      console.error("Cancel error:", err)
      setError("Failed to cancel subscription. Please try again.")
      setCancelLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#7B7EFF]">TH</span>
            <span className="text-2xl font-semibold text-gray-900">TextHume</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-500">Words remaining</p>
              <p className="text-lg font-bold text-[#7B7EFF]">{wordLimit - wordsUsed}</p>
            </div>
            <Link
              href="/pricing"
              className="bg-[#7B7EFF] text-white hover:brightness-110 rounded-lg px-4 py-2 transition-all text-sm font-medium"
            >
              Get more words
            </Link>
            <div className="w-10 h-10 rounded-full bg-[#7B7EFF] text-white flex items-center justify-center font-bold text-sm cursor-pointer hover:brightness-110 transition-all" title={user?.primaryEmailAddress?.emailAddress}>
              {user?.primaryEmailAddress?.emailAddress?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
        </div>
      </nav>

      {/* Profile Content */}
      <div className="max-w-2xl mx-auto px-6 py-20">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
          {/* Header */}
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Your Profile</h1>

          {/* Error Notification */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <div className="text-red-600 font-bold text-lg">⚠</div>
              <div className="text-left flex-grow">
                <p className="font-medium text-red-900">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          )}

          {/* Success Notification */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <div className="text-green-600 font-bold text-lg">✓</div>
              <div className="text-left flex-grow">
                <p className="font-medium text-green-900">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Cancellation Notice */}
          {subscriptionStatus === "canceling" && subscriptionPeriodEnd && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg flex items-start gap-3">
              <div className="text-yellow-600 font-bold text-lg">⏰</div>
              <div className="text-left flex-grow">
                <p className="font-medium text-yellow-900">
                  Your subscription will be cancelled on{" "}
                  <span className="font-bold">
                    {new Date(subscriptionPeriodEnd).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  You'll keep your {getPlanConfig(plan).name} access until then. After your billing period ends, your account will downgrade to the Free plan.
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <>
              {/* Email Section */}
              <div className="mb-10">
                <label className="block text-sm font-medium text-gray-600 mb-3">Email Address</label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-lg text-gray-900">{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
              </div>

              {/* Current Plan Section */}
              <div className="mb-10">
                <label className="block text-sm font-medium text-gray-600 mb-3">Current Plan</label>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{getPlanConfig(plan).name}</p>
                      <p className="text-sm text-gray-600 mt-1">{getPlanConfig(plan).wordLimit.toLocaleString()} words/month</p>
                      <p className="text-sm text-gray-600">{maxPerRequest === Infinity ? '∞' : maxPerRequest.toLocaleString()} words per request</p>
                    </div>
                    {plan !== "premium" && (
                      <Link
                        href="/pricing"
                        className="bg-[#7B7EFF] text-white hover:brightness-110 rounded-lg px-6 py-3 transition-all font-medium"
                      >
                        Upgrade
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Usage Stats Section */}
              <div className="mb-10">
                <label className="block text-sm font-medium text-gray-600 mb-3">Word Usage</label>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Words Used This Month</span>
                    <span className="font-bold text-gray-900">{wordsUsed.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#7B7EFF] h-2 rounded-full transition-all duration-300"
                      style={{
                        width: wordLimit === Infinity ? '0%' : `${(wordsUsed / wordLimit) * 100}%`
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {wordLimit === Infinity ? '∞ words remaining' : `${(wordLimit - wordsUsed).toLocaleString()} words remaining`}
                    </span>
                    <span className="text-gray-600">
                      {wordLimit === Infinity ? '∞' : wordLimit.toLocaleString()} total
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                {plan !== "free" && (
                  <>
                    <button
                      onClick={handleOpenBillingPortal}
                      disabled={portalLoading}
                      className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-6 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {portalLoading ? "Opening..." : "Manage Subscription"}
                    </button>
                    {subscriptionStatus !== "canceling" && (
                      <button
                        onClick={handleCancelSubscription}
                        disabled={cancelLoading}
                        className="bg-red-600 text-white hover:bg-red-700 rounded-lg px-6 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancelLoading ? "Cancelling..." : "Cancel Subscription"}
                      </button>
                    )}
                    <button
                      onClick={() => setShowAccountSettings(true)}
                      className="bg-orange-600 text-white hover:bg-orange-700 rounded-lg px-6 py-3 font-medium transition-colors"
                    >
                      Account Settings
                    </button>
                  </>
                )}
                <SignOutButton>
                  <button className="bg-red-600 text-white hover:bg-red-700 rounded-lg px-6 py-3 font-medium transition-colors">
                    Sign Out
                  </button>
                </SignOutButton>
                <Link href="/app" className="bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-6 py-3 font-medium transition-colors">
                  Back to Dashboard
                </Link>
              </div>

              {/* Account Settings Modal */}
              {showAccountSettings && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                      <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>
                      <button
                        onClick={() => setShowAccountSettings(false)}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="p-6">
                      <UserProfile />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
