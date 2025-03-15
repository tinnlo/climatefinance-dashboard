import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getTokenFromRequest, verifyToken } from './lib/jwt'

export async function middleware(request: NextRequest) {
  console.log('[Middleware Debug] Request:', {
    pathname: request.nextUrl.pathname,
    cookies: request.cookies.getAll().map(c => c.name),
    timestamp: new Date().toISOString()
  });

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Check for JWT token in Authorization header or cookies
  const token = getTokenFromRequest(request)
  const payload = token ? await verifyToken(token) : null
  const isAuthenticated = !!payload

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          })
        },
      },
    }
  )

  // Get the session - this will also refresh the session if needed
  // We still keep Supabase's session management as a fallback/alternative auth method
  // and for Supabase's other functionality
  const {
    data: { session },
  } = await supabase.auth.getSession()

  console.log('[Middleware Debug] Auth check:', {
    hasJwtAuth: isAuthenticated,
    hasSupabaseSession: !!session,
    sessionUser: session?.user?.email,
    pathname: request.nextUrl.pathname,
    timestamp: new Date().toISOString()
  });

  // Allow initial redirects from login by checking for the auth_redirect param
  const isAuthRedirect = request.nextUrl.searchParams.has('auth_redirect')
  
  // Store the original URL to redirect back after login
  const returnToPath = request.nextUrl.pathname + request.nextUrl.search
  
  // Check auth condition but skip the immediate redirect after login
  // Now we check both JWT and Supabase auth - either one is sufficient
  if (!isAuthenticated && !session && !isAuthRedirect && (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/downloads'))) {
    console.log('[Middleware Debug] Unauthorized access, redirecting to login');
    
    // Create a login URL with a return path
    const redirectUrl = new URL('/login', request.url)
    
    // Add the return path as a query parameter
    redirectUrl.searchParams.set('returnTo', returnToPath)
    
    const redirectResponse = NextResponse.redirect(redirectUrl)
    
    // Copy any cookies that were set by the supabase client
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    
    return redirectResponse
  }

  console.log('[Middleware Debug] Access granted:', {
    pathname: request.nextUrl.pathname,
    isAuthRedirect,
    timestamp: new Date().toISOString()
  });

  // Return the response with any cookies set by Supabase auth
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

