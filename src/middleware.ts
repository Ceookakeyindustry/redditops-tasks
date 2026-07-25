import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https:",
      "media-src 'self' blob:",
      "frame-ancestors 'none'",
    ].join('; ')
  );

  // Remove X-Powered-By header
  response.headers.delete('x-powered-by');

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files and api internals
    '/((?!_next/static|_next/image|favicon.ico|logo.svg).*)',
  ],
};
