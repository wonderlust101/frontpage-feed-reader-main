// The real sign-in check for protected pages (proxy.ts only looks for a cookie). Call it inside a <Suspense> boundary:
// with Cache Components, reading request headers outside one is a build error. The session is read once per request
// (React cache), however many parts of the page ask. If the API can't answer, getSession throws and the route's
// error.tsx shows, rather than sending a signed-in reader to sign-in. A layout uses currentUser (no redirect) inside its
// own error boundary, since a route's error.tsx doesn't wrap the layout beside it.

import 'server-only';
import type { SessionResponse, SessionUser } from '@frontpage/shared';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getSession } from '@/lib/api';

const readSession = cache(async (): Promise<SessionResponse> => getSession((await headers()).get('cookie') ?? ''));

// Returns the signed-in user, or redirects to /sign-in?next=<returnTo> when there is no valid session (redirect throws).
export async function requireUser(returnTo: string): Promise<SessionUser> {
    const user = await currentUser();
    if (!user)
        redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);

    return user;
}

// Returns the signed-in user, or null when there is no valid session; never redirects, for a layout that can't know
// the page's path (the page redirects). Throws when the API can't answer, like requireUser.
export async function currentUser(): Promise<SessionUser | null> {
    const session = await readSession();
    return session?.user ?? null;
}
