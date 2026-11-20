import type { getSession } from './auth.service';

export type AuthSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export type AuthUser = AuthSession['user'];
