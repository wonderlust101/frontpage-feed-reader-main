// Every page shares twelve sticker slots: nine for wide screens and three for the phone band, in the panel's container
// units (cqi) so the frame scales with it. Bottom slots are measured from the bottom, so they stay down on tall screens.

import { RESET_TOKEN_MINUTES } from '@frontpage/shared';
import type { Sticker } from '@/components/stickers';
import { categoryFieldById, type FieldId } from '@/features/categories/fields';

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

type PanelInput = {
    headline: string;
    line: string;
    guestLink: boolean;
    wide: WideDecals;
    band: BandDecals;
};

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
    signIn: panel({
        headline: 'Your feeds\nmissed you.',
        line: 'Everything new since you left, already sorted.',
        guestLink: true,
        wide: [
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
        band: [
            { field: field('sky'), icon: 'newsletter' },
            { field: field('leaf'), icon: 'saved-item' },
            { field: field('coral'), icon: 'feed' },
        ],
    }),
    signUp: panel({
        headline: 'Bring your\nfeeds in.',
        line: 'Blogs, newsletters, news. One tidy front page.',
        guestLink: true,
        wide: [
            { field: field('leaf'), icon: 'mark-unread' },
            { field: field('coral'), icon: 'add-feed', label: 'Add a site' },
            { field: field('sky'), label: 'Pick a color' },
            { field: field('lilac'), icon: 'categories' },
            { field: field('tangerine'), icon: 'save', label: 'Save for later' },
            { field: field('rose'), icon: 'feed' },
            { field: field('aqua'), icon: 'website', label: 'Any website' },
            { field: field('sky'), icon: 'newsletter' },
            { field: PAPER, label: 'Yours' },
        ],
        band: [
            { field: field('tangerine'), icon: 'add-feed' },
            { field: field('lilac'), icon: 'categories' },
            { field: field('aqua'), icon: 'website' },
        ],
    }),
    forgotPassword: panel({
        headline: 'It happens\nto us all.',
        line: "Your feeds will keep. We'll get you back in.",
        guestLink: true,
        wide: [
            { field: field('leaf'), icon: 'mark-read' },
            { field: field('coral'), icon: 'newsletter', label: 'Reset link' },
            null,
            { field: field('tangerine'), icon: 'account' },
            null,
            { field: field('sky'), icon: 'refresh' },
            { field: field('lilac'), icon: 'reading-time', label: `Good for ${RESET_TOKEN_MINUTES} min` },
            null,
            null,
        ],
        band: [
            { field: field('coral'), icon: 'newsletter' },
            { field: field('tangerine'), icon: 'account' },
            { field: field('sky'), icon: 'refresh' },
        ],
    }),
    resetPassword: panel({
        headline: 'Same feeds,\nnew key.',
        line: 'Everything you saved stays right where it was.',
        guestLink: true,
        wide: [
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
        band: [
            { field: field('lilac'), icon: 'healthy' },
            { field: field('tangerine'), icon: 'mark-read' },
            { field: field('aqua'), icon: 'refresh' },
        ],
    }),
    verifyEmail: panel({
        headline: 'One tiny\ncode.',
        line: 'Six digits stand between you and your feeds.',
        guestLink: true,
        wide: [
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
        band: [
            { field: field('sky'), icon: 'newsletter' },
            { field: field('coral'), icon: 'notification' },
            { field: field('leaf'), icon: 'mark-read' },
        ],
    }),
    changePassword: panel({
        headline: 'Fresh\npassword.',
        line: 'Same desk. Nothing moves.',
        guestLink: false,
        wide: [
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
        band: [
            { field: field('aqua'), icon: 'account' },
            { field: field('tangerine'), icon: 'healthy' },
            { field: field('lilac'), icon: 'sign-out' },
        ],
    }),
    accountUnavailable: panel({
        headline: 'Back in\na moment.',
        line: "Your feeds are safe. We just can't reach them right now.",
        guestLink: false,
        wide: [
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
        band: [
            { field: field('sky'), icon: 'refresh' },
            { field: field('leaf'), icon: 'healthy' },
            { field: field('tangerine'), icon: 'account' },
        ],
    }),
} satisfies Record<string, AuthPanel>;

// Each decal goes in the slot with its index; the band decals fill the last three.
function panel({ headline, line, guestLink, wide, band }: PanelInput): AuthPanel {
    const decals = [...wide, ...band];
    const stickers = SLOTS.flatMap((slot, index) => {
        const decal = decals[index];

        return decal ? [{ ...slot, ...decal }] : [];
    });

    return { headline, line, guestLink, stickers };
}

function field(id: Exclude<FieldId, 'none'>): string {
    const match = categoryFieldById(id);

    if (!match)
        throw new Error(`Unknown field: ${id}`);

    return match.color;
}
