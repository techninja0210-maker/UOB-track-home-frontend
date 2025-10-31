import { NextRequest, NextResponse } from 'next/server';

// Public routes that do not require authentication
const PUBLIC_PATHS = new Set([
  '/login',
  '/signup',
  '/forgot-password',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml'
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public assets and public paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    Array.from(PUBLIC_PATHS).some((p) => pathname === p || pathname.startsWith(p + '/'))
  ) {
    return NextResponse.next();
  }

  // Read auth token from cookies
  const authToken = req.cookies.get('authToken')?.value;

  // If no token, redirect to login
  if (!authToken) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    // Preserve original destination for post-login redirect
    loginUrl.searchParams.set('redirect', pathname || '/');
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated - proceed
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api).*)'],
};


