// Sign-in failures stay vague on purpose ("email or password"), so the form never reveals which emails have accounts.

import type { AuthFailure } from './auth-request';
import { INVALID_EMAIL_MESSAGE, PASSWORD_TOO_LONG_MESSAGE, PASSWORD_TOO_SHORT_MESSAGE } from './schemas';

const ACCOUNT_EXISTS = 'An account with this email already exists. Sign in instead, or reset your password if you have forgotten it.';

const MESSAGES: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: "That email and password don't match. Check both and try again.",
    USER_ALREADY_EXISTS: ACCOUNT_EXISTS,
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: ACCOUNT_EXISTS,
    INVALID_EMAIL: INVALID_EMAIL_MESSAGE,
    PASSWORD_TOO_SHORT: PASSWORD_TOO_SHORT_MESSAGE,
    PASSWORD_TOO_LONG: PASSWORD_TOO_LONG_MESSAGE,
    INVALID_PASSWORD: 'Your current password is incorrect.',
    INVALID_TOKEN: 'This reset link has expired or was already used. Ask for a new one.',
    EMAIL_NOT_VERIFIED: 'Confirm your email address before signing in.',
    UNAUTHORIZED: 'Your session has ended. Sign in again to change your password.',
    INVALID_OTP: "That code doesn't match. Check the email and try again.",
    OTP_EXPIRED: 'That code has expired. Send a new one.',
    TOO_MANY_ATTEMPTS: 'Too many wrong codes. Send a new one.',
};

const OFFLINE = "You're offline. Check your connection and try again.";
const UNREACHABLE = "Can't reach Frontpage right now. Try again in a few minutes.";
const UNAVAILABLE = 'Accounts are unavailable right now. Try again in a few minutes.';
const TOO_MANY_REQUESTS = 'Too many tries in a row. Take a minute, then try again.';
const FALLBACK = 'Something went wrong on our end. Try again in a moment.';

// A request with no answer only blames the connection when the browser says it is offline.
export function authErrorMessage(failure: AuthFailure): string {
    if (failure.status === 0)
        return failure.offline ? OFFLINE : UNREACHABLE;

    if (failure.status === 429) {
        const seconds = failure.retryAfterSeconds;

        if (!seconds)
            return TOO_MANY_REQUESTS;

        const wait = seconds === 1 ? '1 second' : `${seconds} seconds`;

        return `Too many tries in a row. Try again in ${wait}.`;
    }

    if (failure.status >= 500)
        return UNAVAILABLE;

    return (failure.code && MESSAGES[failure.code]) || FALLBACK;
}
