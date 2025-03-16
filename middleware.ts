// This file is intentionally empty to disable server-side middleware
// Authentication is now handled client-side for static generation compatibility

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware function will run on every request
export function middleware(request: NextRequest) {
  // You can add authentication checks or other middleware logic here
  return NextResponse.next();
}

// Configure which paths this middleware will run on
export const config = {
  // Only run middleware on specific paths that need it
  matcher: [
    // Skip static files and API routes
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};

