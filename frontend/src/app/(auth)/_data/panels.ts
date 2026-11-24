// Each auth page's sticker panel: a headline, one line of flavour text under it, and its stickers. Every page uses the
// same twelve sticker slots: nine for wide screens (the "grounded frame": light along the top, heavier toward the
// bottom and the form, and always well clear of the logo and the headline) and three for the phone band. A page may
// leave wide slots empty (null), so the pages share one composition but each has its own decals and lead colour. Slots
// are in the panel's container units (cqi),
// so the frame scales with the panel; bottom slots are measured from the bottom so they stay down on tall screens.
// Wide-only slots drop out on phones, where the panel is a short band: the top-right sticker stays, and three small
// narrow-only slots (the last three) cluster along the band's bottom edge, right of the flavour line (capped at 62cqi)
// and partly cut off by the edge, so the band reads as the brand rather than a yellow header.
// Headlines carry their own line breaks (\n), so the display type wraps in the same places at every width.

import type { Sticker } from '@/components/stickers';
import { FIELDS, type FieldId } from '@/features/categories/fields';

export type AuthPanel = {
    headline: string;
    line: string;
    guestLink: boolean;
    stickers: Sticker[];
};

type Slot = Omit<Sticker, 'field' | 'icon' | 'label'>;

type Decal = Pick<Sticker, 'field' | 'icon' | 'label'>;

type WideDecals = readonly [Decal | null, Decal | null, Decal | null, Decal | null, Decal | null, Decal | null, Decal | null, Decal | null, Decal | null];

type BandDecals = readonly [Decal, Decal, Decal];

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
    { shape: 'circle', size: '14cqi', x: '68cqi', y: 'calc(100% - 11cqi)', tilt: 8, drift: ['0cqi', '0cqi'], narrowOnly: true },
    { shape: 'square', size: '12cqi', x: '81cqi', y: 'calc(100% - 17cqi)', tilt: -10, drift: ['0cqi', '0cqi'], narrowOnly: true },
    { shape: 'circle', size: '15cqi', x: '91cqi', y: 'calc(100% - 10cqi)', tilt: 12, drift: ['0cqi', '0cqi'], narrowOnly: true },
];

export const AUTH_PANELS = {
    signIn: panel(
        'Your feeds\nmissed you.',
        'Everything new since you left, already sorted.',
        true,
        [
            { field: field('rose'), icon: 'mark-unread' },
            { field: field('sky'), icon: 'newsletter', label: 'Newsletters' },
            { field: field('leaf'), label: '24 unread' },
            { field: field('tangerine'), icon: 'caught-up' },
            { field: field('lilac'), icon: 'saved-item', label: 'Saved for later' },
            { field: field('coral'), icon: 'feed' },
            { field: field('aqua'), icon: 'website', label: 'Any website' },
            { field: field('sky'), icon: 'refresh' },
            { field: PAPER, label: 'New!' },
        ],
        [
            { field: field('sky'), icon: 'newsletter' },
            { field: field('leaf'), icon: 'saved-item' },
            { field: field('coral'), icon: 'feed' },
        ],
    ),
    signUp: panel(
        'Bring your\nfeeds in.',
        'Blogs, newsletters, news. One tidy front page.',
        true,
        [
            { field: field('leaf'), icon: 'mark-unread' },
            { field: field('coral'), icon: 'add-feed', label: 'Add a site' },
            { field: field('sky'), label: 'Pick a colour' },
            { field: field('lilac'), icon: 'categories' },
            { field: field('tangerine'), icon: 'save', label: 'Save for later' },
            { field: field('rose'), icon: 'feed' },
            { field: field('aqua'), icon: 'website', label: 'Any website' },
            { field: field('sky'), icon: 'newsletter' },
            { field: PAPER, label: 'Yours' },
        ],
        [
            { field: field('tangerine'), icon: 'add-feed' },
            { field: field('lilac'), icon: 'categories' },
            { field: field('aqua'), icon: 'website' },
        ],
    ),
    forgotPassword: panel(
        'It happens\nto us all.',
        "Your feeds will keep. We'll get you back in.",
        true,
        [
            { field: field('leaf'), icon: 'mark-read' },
            { field: field('coral'), icon: 'newsletter', label: 'Reset link' },
            null,
            { field: field('tangerine'), icon: 'account' },
            null,
            { field: field('sky'), icon: 'refresh' },
            { field: field('lilac'), icon: 'reading-time', label: 'Good for 60 min' },
            null,
            null,
        ],
        [
            { field: field('coral'), icon: 'newsletter' },
            { field: field('tangerine'), icon: 'account' },
            { field: field('sky'), icon: 'refresh' },
        ],
    ),
    resetPassword: panel(
        'Same feeds,\nnew key.',
        'Everything you saved stays right where it was.',
        true,
        [
            null,
            null,
            null,
            { field: field('lilac'), icon: 'healthy' },
            { field: field('tangerine'), icon: 'mark-read', label: 'One link, one use' },
            { field: field('aqua'), icon: 'refresh' },
            null,
            null,
            { field: field('leaf'), label: 'Fresh!' },
        ],
        [
            { field: field('lilac'), icon: 'healthy' },
            { field: field('tangerine'), icon: 'mark-read' },
            { field: field('aqua'), icon: 'refresh' },
        ],
    ),
    verifyEmail: panel(
        'One tiny\ncode.',
        'Six digits stand between you and your feeds.',
        true,
        [
            null,
            { field: field('sky'), icon: 'newsletter', label: 'Check your inbox' },
            { field: field('coral'), label: '6-digit code' },
            { field: field('tangerine'), icon: 'notification' },
            null,
            { field: field('leaf'), icon: 'mark-read' },
            null,
            { field: field('lilac'), icon: 'newsletter' },
            null,
        ],
        [
            { field: field('sky'), icon: 'newsletter' },
            { field: field('coral'), icon: 'notification' },
            { field: field('leaf'), icon: 'mark-read' },
        ],
    ),
    changePassword: panel(
        'Fresh\npassword.',
        'Same desk. Nothing moves.',
        false,
        [
            null,
            { field: field('aqua'), icon: 'sign-out', label: 'Sign out other devices' },
            null,
            { field: field('tangerine'), icon: 'account' },
            null,
            { field: field('lilac'), icon: 'healthy' },
            null,
            null,
            { field: PAPER, label: 'Yours' },
        ],
        [
            { field: field('aqua'), icon: 'account' },
            { field: field('tangerine'), icon: 'healthy' },
            { field: field('lilac'), icon: 'sign-out' },
        ],
    ),
    accountUnavailable: panel(
        'Back in\na moment.',
        "Your feeds are safe. We just can't reach them right now.",
        false,
        [
            null,
            null,
            null,
            { field: field('sky'), icon: 'refresh' },
            null,
            { field: field('leaf'), icon: 'healthy' },
            null,
            null,
            { field: PAPER, label: 'Hang on' },
        ],
        [
            { field: field('sky'), icon: 'refresh' },
            { field: field('leaf'), icon: 'healthy' },
            { field: field('tangerine'), icon: 'account' },
        ],
    ),
} satisfies Record<string, AuthPanel>;

// Builds a panel, placing each decal in its slot (same index; the band decals fill the last three) and skipping empty slots.
function panel(headline: string, line: string, guestLink: boolean, wide: WideDecals, band: BandDecals): AuthPanel {
    const decals = [...wide, ...band];
    const stickers = SLOTS.flatMap((slot, index) => {
        const decal = decals[index];
        return decal ? [{ ...slot, ...decal }] : [];
    });
    return { headline, line, guestLink, stickers };
}

// Returns the CSS colour for a field, e.g. field('coral') → 'var(--color-field-coral)', from the shared field list.
function field(id: Exclude<FieldId, 'none'>): string {
    const match = FIELDS.find((candidate) => candidate.id === id);
    if (!match) {
        throw new Error(`Unknown field: ${id}`);
    }
    return match.color;
}
