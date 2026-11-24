// The real sign-in check (proxy.ts only looks for a cookie). Call it inside <Suspense>: with Cache Components,
// reading headers outside one is a build error. If the API can't answer it throws, so error.tsx shows.

import 'server-only';
import type { SessionResponse, SessionUser } from '@frontpage/shared';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getSession } from '@/lib/api';

const readSession = cache(async (): Promise<SessionResponse> => getSession((await headers()).get('cookie') ?? ''));

// Redirects to /sign-in?next=<returnTo> when there is no valid session.
export async function requireUser(returnTo: string): Promise<SessionUser> {
    const user = await currentUser();

    if (!user)
        redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);

    return user;
}

// Never redirects, for a layout that can't know the page's path; it renders inside its own error boundary.
export async function currentUser(): Promise<SessionUser | null> {
    const session = await readSession();

    return session?.user ?? null;
}
