// Only checks that a session cookie exists; the page checks it is valid. It never sends signed-in visitors away from
// /sign-in: with an expired cookie the two checks would bounce between pages forever.

import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

// Staging names its cookie differently (AUTH_COOKIE_PREFIX, the API's own setting) so production's never counts here.
const COOKIE_PREFIX = process.env.AUTH_COOKIE_PREFIX || undefined;

export const config = {
    matcher: ['/user/:path*', '/account/:path*'],
};

export function proxy(request: NextRequest) {
    if (getSessionCookie(request, { cookiePrefix: COOKIE_PREFIX }))
        return NextResponse.next();

    const signIn = new URL('/sign-in', request.url);

    signIn.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);

    return NextResponse.redirect(signIn);
}
