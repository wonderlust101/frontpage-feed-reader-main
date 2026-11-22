// The sign-in page's headings: the usual one, and the two that greet a reader arriving from a password reset or a
// confirmed email. Shared by the page (which picks one from the URL) and the form (which returns to the usual one
// once a sign-in attempt fails, so "You're confirmed" never sits above "Couldn't sign you in").

export type SignInArrival = 'reset' | 'verified' | null;

export const SIGN_IN_HEADINGS = {
    default: { title: 'Sign in', description: 'Good to see you again. Your front page is waiting.' },
    reset: { title: 'Password changed', description: "New key, same feeds. Sign in with it and you're back." },
    verified: { title: "You're confirmed", description: 'Welcome aboard! Sign in to open your front page for the first time.' },
};
