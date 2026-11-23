// The guest's nudge at the foot of the shell's sidebar: what an account keeps, and the way to make one. It never blocks
// anything; guests read freely without it.

import Link from 'next/link';
import { buttonClassName } from '@/components/ui/button';

// Renders the card.
export function GuestCard() {
    return (
        <div className="rounded-panel border-[1.5px] border-ink bg-ground p-4">
            <p className="font-semibold">Reading as a guest</p>
            <p className="mt-1 text-meta text-ink-2">Create an account to keep your feeds, colors and saved items.</p>
            <Link href="/sign-up" className={buttonClassName('primary', 'mt-3')}>
                Create account
            </Link>
        </div>
    );
}
