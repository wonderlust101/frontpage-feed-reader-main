// A step whose mood differs from its page's (a sent link, an expired one) carries its own panel text, so the Lemon
// panel never cheers beside bad news. A plain module, so server pages and client forms can both import it.

import { CODE_LENGTH, CODE_LIFETIME_MINUTES } from './schemas';

export type PanelText = { headline: string; line: string };

export type Heading = { title: string; description: string; panel?: PanelText };

export type SignInArrival = 'reset' | null;

export const SIGN_IN_HEADINGS = {
    default: { title: 'Sign in', description: 'Good to see you again. Your front page is waiting.' },
    reset: { title: 'Password changed', description: "Your new password is set. Sign in with it and you're back." },
} satisfies Record<string, Heading>;

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

export const ACCOUNT_UNAVAILABLE_HEADING = {
    title: "Can't reach your account",
    description: 'Accounts are unavailable right now. Your feeds are safe; try again in a few minutes.',
} satisfies Heading;

export const CHANGE_PASSWORD_HEADINGS = {
    default: { title: 'Change your password', description: "Pick one you don't use anywhere else. Your feeds stay exactly as they are." },
    changed: { title: 'Password changed', description: 'Your new password is set. Use it next time you sign in.' },
} satisfies Record<string, Heading>;

export function codeStepHeading(email: string): Heading {
    return {
        title: VERIFY_EMAIL_HEADINGS.default.title,
        description: `We sent a ${CODE_LENGTH}-digit code to ${email}. It expires in ${CODE_LIFETIME_MINUTES} minutes.`,
    };
}

export function signInArrival(params: Record<string, string | string[] | undefined>): SignInArrival {
    return params.reset ? 'reset' : null;
}
