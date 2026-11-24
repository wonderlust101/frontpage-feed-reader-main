// Sends signed-out visitors to sign-in before a protected page renders, so they never see it flash. This only checks
// that a session cookie exists; the page checks the session is valid (requireUser). It never sends signed-in visitors
// away from /sign-in: with an expired cookie the two checks would bounce the visitor between pages forever.

import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

// Staging names its cookie differently (AUTH_COOKIE_PREFIX, the API's own setting) so production's never counts here.
const COOKIE_PREFIX = process.env.AUTH_COOKIE_PREFIX || undefined;

export const config = {
    matcher: ['/user/:path*', '/account/:path*'],
};

// Redirects to /sign-in?next=<this page> when the request has no Better Auth session cookie; otherwise lets it through.
export function proxy(request: NextRequest) {
    if (getSessionCookie(request, { cookiePrefix: COOKIE_PREFIX }))
        return NextResponse.next();

    const signIn = new URL('/sign-in', request.url);
    signIn.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(signIn);
}
