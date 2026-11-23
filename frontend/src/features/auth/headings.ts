// Every auth page's h1 and description, in one place: each page's default, and the ones a step swaps in when it
// changes what just happened ("Check your inbox", "Password changed", "This link no longer works"). Pages pass a
// default to the frame; forms swap theirs in with useAuthHeading. A step whose mood differs from its page's (a sent
// link, an expired one) also carries its own panel text, so the Lemon panel never cheers beside bad news. A plain
// module (not 'use client'), so server pages and client forms can both import it.

import { CODE_LENGTH, CODE_LIFETIME_MINUTES } from './schemas';

// The panel's display headline (with its own line breaks) and the flavour line under it.
export type PanelText = { headline: string; line: string };

export type Heading = { title: string; description: string; panel?: PanelText };

export const SIGN_IN_HEADINGS = {
    default: { title: 'Sign in', description: 'Good to see you again. Your front page is waiting.' },
    reset: { title: 'Password changed', description: "Your new password is set. Sign in with it and you're back." },
} satisfies Record<string, Heading>;

// How the reader arrived at sign-in: from a password reset, or not.
export type SignInArrival = Exclude<keyof typeof SIGN_IN_HEADINGS, 'default'> | null;

export const SIGN_UP_HEADING = {
    title: 'Create account',
    description: 'It takes a minute. Your feeds, categories and saved posts follow you to every device.',
} satisfies Heading;

export const FORGOT_PASSWORD_HEADINGS = {
    default: { title: 'Forgot your password?', description: "No problem. Tell us your email and we'll send you a reset link." },
    sent: {
        title: 'Check your inbox',
        description: "One click on the link and you're picking a new password.",
        panel: { headline: 'On its\nway.', line: 'Look for an email from Frontpage.' },
    },
} satisfies Record<string, Heading>;

export const RESET_PASSWORD_HEADINGS = {
    choose: { title: 'Choose a new password', description: "Make it one you'll remember. It works on every device from now on." },
    expired: {
        title: 'This link no longer works',
        description: "No harm done. Grab a fresh one and you'll be back in a moment.",
        panel: { headline: 'Links go\nstale.', line: "Your feeds don't. Grab a fresh link." },
    },
} satisfies Record<string, Heading>;

export const VERIFY_EMAIL_HEADINGS = {
    default: { title: 'Confirm your email', description: "Just checking it's really you, so you can always get back in." },
    emailStep: { title: 'Where should the code go?', description: "Pop in your email and we'll send six digits over." },
} satisfies Record<string, Heading>;

// The verify code step's heading, which says where the code went and how long it lasts.
export function codeStepHeading(email: string): Heading {
    return {
        title: VERIFY_EMAIL_HEADINGS.default.title,
        description: `We sent a ${CODE_LENGTH}-digit code to ${email}. It expires in ${CODE_LIFETIME_MINUTES} minutes.`,
    };
}

// What a signed-in page shows when the API can't say who is signed in (down, slow or erroring).
export const ACCOUNT_UNAVAILABLE_HEADING = {
    title: "Can't reach your account",
    description: 'Accounts are unavailable right now. Your feeds are safe; try again in a few minutes.',
} satisfies Heading;

export const CHANGE_PASSWORD_HEADINGS = {
    default: { title: 'Change your password', description: "Pick one you don't use anywhere else. Your feeds stay exactly as they are." },
    changed: { title: 'Password changed', description: 'Your new password is set. Use it next time you sign in.' },
} satisfies Record<string, Heading>;

// Reads the arrival from the sign-in page's URL parameters (?reset=1).
export function signInArrival(params: Record<string, string | string[] | undefined>): SignInArrival {
    return params.reset ? 'reset' : null;
}
