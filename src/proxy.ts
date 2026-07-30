import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_COOKIE, USER_COOKIE, sha256Hex } from '@/lib/auth'

// Paths that must stay reachable without the password.
const PUBLIC = ['/login', '/api/login', '/api/logout', '/api/sms', '/sms']

export async function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD
  // Gate is disabled until a password is configured (avoids local/dev lockout).
  if (!password) return NextResponse.next()

  const { pathname } = request.nextUrl
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next()

  const expected = await sha256Hex(password)
  const adminOk = request.cookies.get(AUTH_COOKIE)?.value === expected
  // Per-person sessions are validated server-side (needs the DB); here we only
  // require the cookie to be present so the coarse gate lets them through.
  const userOk = !!request.cookies.get(USER_COOKIE)?.value
  if (adminOk || userOk) return NextResponse.next()

  if (pathname.startsWith('/api/')) return new NextResponse('Unauthorized', { status: 401 })

  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  // Run on everything except Next static assets and files with an extension.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)'],
}
