import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  console.log('[Middleware Debug] Request:', {
    pathname: req.nextUrl.pathname,
    timestamp: new Date().toISOString()
  });

  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  console.log('[Middleware Debug] Session check:', {
    hasSession: !!session,
    pathname: req.nextUrl.pathname,
    timestamp: new Date().toISOString()
  });

  // Check auth condition
  if (!session && (req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname.startsWith('/admin'))) {
    console.log('[Middleware Debug] Unauthorized access, redirecting to login');
    // Redirect to login if not authenticated
    const redirectUrl = new URL('/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  console.log('[Middleware Debug] Access granted:', {
    pathname: req.nextUrl.pathname,
    timestamp: new Date().toISOString()
  });

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*']
}

