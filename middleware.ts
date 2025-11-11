import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/about',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

// Get allowed origin from environment, default to current domain
const ALLOWED_ORIGINS = process.env.NEXT_PUBLIC_APP_URL?.split(',') || ['https://texthume.com']

export default clerkMiddleware(async (auth, req) => {
  // Add CORS headers for API routes (except webhooks which are public)
  if (req.nextUrl.pathname.startsWith('/api/') && !req.nextUrl.pathname.startsWith('/api/webhooks')) {
    const origin = req.headers.get('origin')

    // Only allow requests from our domain(s)
    if (origin && ALLOWED_ORIGINS.some(allowedOrigin => origin === allowedOrigin)) {
      const response = NextResponse.next()
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE, PUT')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      return response
    }
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin')
    if (origin && ALLOWED_ORIGINS.some(allowedOrigin => origin === allowedOrigin)) {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      })
    }
    return new NextResponse(null, { status: 403 })
  }

  // Protect non-public routes
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!.*\\..*|_next|api/webhooks).*)',
    '/',
    '/(api|trpc)(!webhooks)(.*)',
  ],
}
