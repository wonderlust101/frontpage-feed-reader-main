// Each auth page's left panel: a headline, one supporting line, and its stickers. Every page fills the same nine
// sticker slots (the "grounded frame": light along the top, heavier toward the bottom and the form, and always well
// clear of the logo and the headline), so the pages
// share one composition but each has its own decals and lead colour. Slots are in the panel's container units (cqi),
// so the frame scales with the panel; bottom slots are measured from the bottom so they stay down on tall screens.
// Wide-only slots drop out on phones, where the panel is a short band and only the top-right sticker stays (the
// headline fills the band's width, so nothing else could keep clear of it).
// Headlines carry their own line breaks (\n), so the display type wraps in the same places at every width.

import type { Sticker } from '@/components/stickers';
import type { FieldId } from '@/features/categories/fields';

export type AuthPanel = {
    headline: string;
    line: string;
    guestLink: boolean;
    stickers: Sticker[];
};

type Slot = Omit<Sticker, 'field' | 'icon' | 'label'>;

type Decal = Pick<Sticker, 'field' | 'icon' | 'label'>;

type SlotDecals = readonly [Decal | null, Decal | null, Decal | null, Decal | null, Decal | null, Decal | null, Decal | null, Decal | null, Decal | null];

const PAPER = 'var(--color-on-ink)';

const SLOTS: readonly Slot[] = [
    { shape: 'circle', size: '16cqi', x: '78cqi', y: '-5cqi', tilt: 12, drift: ['-3cqi', '4cqi'] },
    { shape: 'pill', size: '2.7cqi', x: '40cqi', y: '-1.8cqi', tilt: -5, drift: ['0cqi', '3cqi'], wideOnly: true },
    { shape: 'square', size: '17cqi', x: '84cqi', y: '32cqi', tilt: -8, drift: ['-3cqi', '1.5cqi'], wideOnly: true },
    { shape: 'circle', size: '18cqi', x: '86cqi', y: '54cqi', tilt: -12, drift: ['-3cqi', '0cqi'], wideOnly: true },
    { shape: 'pill', size: '3cqi', x: '64cqi', y: 'calc(100% - 40cqi)', tilt: -6, drift: ['-2cqi', '-3cqi'], wideOnly: true },
    { shape: 'circle', size: '28cqi', x: '72cqi', y: 'calc(100% - 24cqi)', tilt: 10, drift: ['-3cqi', '-3cqi'], wideOnly: true },
    { shape: 'pill', size: '3cqi', x: '30cqi', y: 'calc(100% - 11cqi)', tilt: 4, drift: ['0cqi', '-3cqi'], wideOnly: true },
    { shape: 'circle', size: '18cqi', x: '-6cqi', y: 'calc(100% - 20cqi)', tilt: 6, drift: ['3cqi', '-3cqi'], wideOnly: true },
    { shape: 'square', size: '13cqi', x: '11cqi', y: 'calc(100% - 9cqi)', tilt: -9, drift: ['2cqi', '-3cqi'], wideOnly: true },
];

export const AUTH_PANELS = {
    signIn: panel('Your feeds\nmissed you.', 'Everything new since your last visit, waiting on one tidy front page.', true, [
        { field: field('rose'), icon: 'mark-unread' },
        { field: field('sky'), icon: 'newsletter', label: 'Newsletters' },
        { field: field('leaf'), label: '24 unread' },
        { field: field('tangerine'), icon: 'caught-up' },
        { field: field('lilac'), icon: 'saved-item', label: 'Saved for later' },
        { field: field('coral'), icon: 'feed' },
        { field: field('aqua'), icon: 'website', label: 'Any website' },
        { field: field('sky'), icon: 'refresh' },
        { field: PAPER, label: 'New!' },
    ]),
    signUp: panel('Bring your\nfeeds in.', 'Every blog, newsletter and news site you love, sorted your way.', true, [
        { field: field('leaf'), icon: 'mark-unread' },
        { field: field('coral'), icon: 'add-feed', label: 'Add a site' },
        { field: field('sky'), label: 'Pick a colour' },
        { field: field('lilac'), icon: 'categories' },
        { field: field('tangerine'), icon: 'save', label: 'Save for later' },
        { field: field('rose'), icon: 'feed' },
        { field: field('aqua'), icon: 'website', label: 'Any website' },
        { field: field('sky'), icon: 'newsletter' },
        { field: PAPER, label: 'Yours' },
    ]),
    forgotPassword: panel('It happens\nto us all.', 'We’ll send a link to your inbox. Your feeds will wait.', true, [
        { field: field('leaf'), icon: 'mark-read' },
        { field: field('coral'), icon: 'newsletter', label: 'Check your inbox' },
        null,
        { field: field('tangerine'), icon: 'account' },
        null,
        { field: field('sky'), icon: 'refresh' },
        { field: field('lilac'), icon: 'reading-time', label: 'Good for 60 min' },
        null,
        null,
    ]),
    resetPassword: panel('Same feeds,\nnew key.', 'Everything you saved is right where you left it.', true, [
        null,
        null,
        null,
        { field: field('lilac'), icon: 'healthy' },
        { field: field('tangerine'), icon: 'mark-read', label: 'One link, one use' },
        { field: field('aqua'), icon: 'refresh' },
        null,
        null,
        { field: field('leaf'), label: 'New password' },
    ]),
    verifyEmail: panel('One tiny\ncode.', 'Pop in the six digits from your inbox and you’re all set.', true, [
        null,
        { field: field('sky'), icon: 'newsletter', label: 'Check your inbox' },
        { field: field('coral'), label: '6-digit code' },
        { field: field('tangerine'), icon: 'notification' },
        null,
        { field: field('leaf'), icon: 'mark-read' },
        null,
        { field: field('lilac'), icon: 'newsletter' },
        null,
    ]),
    changePassword: panel('Fresh\npassword.', 'Swap it out, and sign out your other devices while you’re at it.', false, [
        null,
        { field: field('aqua'), icon: 'sign-out', label: 'Sign out other devices' },
        null,
        { field: field('tangerine'), icon: 'account' },
        null,
        { field: field('lilac'), icon: 'healthy' },
        null,
        null,
        { field: PAPER, label: 'Yours' },
    ]),
} satisfies Record<string, AuthPanel>;

// Builds a panel, placing each decal in its slot (same index) and skipping empty slots.
function panel(headline: string, line: string, guestLink: boolean, decals: SlotDecals): AuthPanel {
    const stickers = SLOTS.flatMap((slot, index) => {
        const decal = decals[index];
        return decal ? [{ ...slot, ...decal }] : [];
    });
    return { headline, line, guestLink, stickers };
}

// Returns the CSS colour for a field, e.g. field('coral') → 'var(--color-field-coral)'.
function field(id: Exclude<FieldId, 'none'>): string {
    return `var(--color-field-${id})`;
}
