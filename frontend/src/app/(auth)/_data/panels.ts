// Each auth page's left panel: a headline, one supporting line, and its stickers. Every page fills the same nine
// sticker slots (the "grounded frame": light along the top, heavier toward the bottom and the form), so the pages
// share one composition but each has its own decals and lead colour. Slots are in the panel's container units (cqi),
// so the frame scales with the panel; bottom slots are measured from the bottom so they stay down on tall screens.
// Wide-only slots drop out on phones, where the panel is a short band and only the right-edge stickers stay.
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
    { shape: 'circle', size: '13.5cqi', x: '75.8cqi', y: '-4.8cqi', tilt: 12, drift: ['-4cqi', '5cqi'] },
    { shape: 'pill', size: '2.9cqi', x: '-6cqi', y: '-2.5cqi', tilt: -6, drift: ['4cqi', '4cqi'], wideOnly: true },
    { shape: 'square', size: '19.4cqi', x: '80cqi', y: '40cqi', tilt: -8, drift: ['-5cqi', '1.5cqi'] },
    { shape: 'circle', size: '21cqi', x: '82cqi', y: '50%', tilt: -12, drift: ['-5cqi', '0cqi'], wideOnly: true },
    { shape: 'pill', size: '3.3cqi', x: '61.3cqi', y: 'calc(100% - 32.3cqi)', tilt: 6, drift: ['-2.5cqi', '-4cqi'], wideOnly: true },
    { shape: 'circle', size: '24.2cqi', x: '79cqi', y: 'calc(100% - 19.4cqi)', tilt: 10, drift: ['-4.5cqi', '-4.5cqi'] },
    { shape: 'pill', size: '3.3cqi', x: '30.6cqi', y: 'calc(100% - 9.4cqi)', tilt: -3, drift: ['0cqi', '-4cqi'], wideOnly: true },
    { shape: 'circle', size: '15.5cqi', x: '-6.5cqi', y: 'calc(100% - 12.9cqi)', tilt: 6, drift: ['4cqi', '-4cqi'], wideOnly: true },
    { shape: 'square', size: '15.5cqi', x: '-3cqi', y: 'calc(100% - 35.5cqi)', tilt: -9, drift: ['4.5cqi', '-2.5cqi'], wideOnly: true },
];

export const AUTH_PANELS = {
    signIn: panel('Pick up\nwhere you\nleft off.', 'Every site you follow, on one calm front page.', true, [
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
    signUp: panel('Make it\nyours.', 'Your sources, your categories, your pace.', true, [
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
    forgotPassword: panel('Back in\na minute.', 'We’ll email you a link to choose a new password.', true, [
        { field: field('leaf'), icon: 'mark-read' },
        { field: field('coral'), icon: 'newsletter', label: 'Check your inbox' },
        null,
        { field: field('tangerine'), icon: 'account' },
        null,
        { field: field('sky'), icon: 'refresh' },
        { field: field('lilac'), icon: 'reading-time', label: 'Link lasts 60 minutes' },
        null,
        null,
    ]),
    resetPassword: panel('Fresh\nstart.', 'Choose a new password and you’re back in.', true, [
        null,
        null,
        { field: field('leaf'), label: 'New password' },
        { field: field('lilac'), icon: 'healthy' },
        { field: field('tangerine'), icon: 'mark-read', label: 'One link, one use' },
        { field: field('aqua'), icon: 'refresh' },
        null,
        null,
        { field: PAPER, label: 'Fresh!' },
    ]),
    verifyEmail: panel('Check\nyour inbox.', 'One short code, and your account is confirmed.', true, [
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
    changePassword: panel('Keep it\nyours.', 'A new password, and other devices signed out if you like.', false, [
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
