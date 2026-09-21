import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';

const REDIRECT_TO = process.env.REDIRECT_TO?.trim();
const AUTH_SECRET = process.env.AUTH_SECRET?.trim();

/** Reachable without signing in. */
const OPEN = ['/login', '/api/auth', '/logos', '/photos/', '/artie-logo.png', '/default-race.jpg'];

export async function middleware(request: NextRequest) {
  if (REDIRECT_TO) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<meta http-equiv="refresh" content="10;url=${REDIRECT_TO}"><title>Artie has moved!</title></head>` +
      `<body style="font-family:-apple-system,sans-serif;max-width:480px;margin:60px auto;padding:24px;text-align:center">` +
      `<h1>Artie has a new home</h1><p>Redirecting in 10 seconds.</p>` +
      `<a href="${REDIRECT_TO}" style="display:inline-block;margin:16px 0;padding:14px 28px;background:#1B2A4A;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">Go now</a>` +
      `</body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Without a secret there is nothing to verify against, so leave ARTIE open
  // rather than locking everyone out the moment this deploys.
  if (!AUTH_SECRET) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (OPEN.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();

  const name = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, AUTH_SECRET);
  if (name) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }
  const login = request.nextUrl.clone();
  login.pathname = '/login';
  login.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(login);
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
