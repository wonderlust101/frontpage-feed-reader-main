// What an account adds, as guests see it in the shell: each feature as a locked view whose preview says what it does,
// and whose Create account button leads to sign-up. The guest shell and the /design-system demo share this list.

import type { ShellView } from '@/components/app-shell/nav-entries';

export const ACCOUNT_FEATURE_VIEWS = [
    { href: '/sign-up', label: 'Saved', icon: 'saved', preview: 'Keep articles for later in one list, ready on any device you sign in on.' },
    {
        href: '/sign-up',
        label: 'Weekly digest',
        icon: 'digest',
        preview: 'One page that sums up the week across your feeds, so the important posts never slip by.',
    },
    { href: '/sign-up', label: 'Reading stats', icon: 'analytics', preview: 'See what you read, how much and when, across your categories.' },
] satisfies ShellView[];
