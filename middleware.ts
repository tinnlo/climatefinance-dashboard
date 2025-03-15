import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  console.log('[Middleware Debug] Request:', {
    pathname: req.nextUrl.pathname,
    cookies: req.cookies.getAll().map(c => c.name),
    timestamp: new Date().toISOString()
  });

  // Create a response object that we can modify
  const res = NextResponse.next()
  
  // Create a Supabase client specifically for the middleware
  const supabase = createMiddlewareClient({ req, res })

  // Get the session - this will also refresh the session if needed
  const {
    data: { session },
  } = await supabase.auth.getSession()

  console.log('[Middleware Debug] Session check:', {
    hasSession: !!session,
    sessionUser: session?.user?.email,
    pathname: req.nextUrl.pathname,
    timestamp: new Date().toISOString()
  });

  // Allow initial redirects from login by checking for the auth_redirect param
  const isAuthRedirect = req.nextUrl.searchParams.has('auth_redirect')
  
  // Store the original URL to redirect back after login
  const returnToPath = req.nextUrl.pathname + req.nextUrl.search
  
  // Check auth condition but skip the immediate redirect after login
  if (!session && !isAuthRedirect && (req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/downloads'))) {
    console.log('[Middleware Debug] Unauthorized access, redirecting to login');
    
    // Create a login URL with a return path
    const redirectUrl = new URL('/login', req.url)
    
    // Add the return path as a query parameter
    redirectUrl.searchParams.set('returnTo', returnToPath)
    
    const redirectResponse = NextResponse.redirect(redirectUrl)
    
    // Copy any cookies that were set by the supabase client
    res.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    
    return redirectResponse
  }

  console.log('[Middleware Debug] Access granted:', {
    pathname: req.nextUrl.pathname,
    isAuthRedirect,
    timestamp: new Date().toISOString()
  });

  // Return the response with any cookies set by Supabase auth
  return res
}

export const config = {
  matcher: ['/admin/:path*', '/downloads/:path*']
}

