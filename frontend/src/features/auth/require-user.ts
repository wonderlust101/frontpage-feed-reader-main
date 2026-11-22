// The real sign-in check for protected pages (proxy.ts only looks for a cookie). Call it inside a <Suspense> boundary:
// with Cache Components, reading request headers outside one is a build error.

import 'server-only';
import type { SessionUser } from '@frontpage/shared';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api';

// Returns the signed-in user, or redirects to /sign-in?next=<returnTo> when there is no valid session (redirect throws).
export async function requireUser(returnTo: string): Promise<SessionUser> {
    const cookieHeader = (await headers()).get('cookie') ?? '';
    const session = await getSession(cookieHeader);
    if (!session) {
        redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
    }
    return session.user;
}
