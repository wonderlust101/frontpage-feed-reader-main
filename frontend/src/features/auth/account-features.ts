// What an account adds, as locked views guests see in the shell; shared by the guest shell and /design-system.

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
