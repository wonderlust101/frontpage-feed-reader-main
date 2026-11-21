// Logo section of the design system page: the lockup on each ground, the mark's variants and size ladder,
// the usage rules, and the exported files.

import { Logo, LogoMark } from '@/components/logo';
import { DocSection, Specimen } from './doc-section';

const GROUNDS = [
    { name: 'On the ground', note: 'Lemon mark, ink wordmark', background: 'var(--color-ground)', ink: 'var(--color-ink)', variant: 'lemon' },
    { name: 'On Lemon or a field', note: 'Ink mark, ink wordmark', background: 'var(--color-field-lemon)', ink: 'var(--color-on-field)', variant: 'ink' },
    { name: 'On ink', note: 'Lemon mark, light wordmark', background: 'var(--color-on-field)', ink: 'var(--color-on-ink)', variant: 'lemon' },
] as const;

const MARK_SIZES = [
    { px: 16, use: 'Favicon' },
    { px: 20, use: 'Inline, small lockup' },
    { px: 28, use: 'Top bar lockup' },
    { px: 32, use: 'Browser tab' },
    { px: 56, use: 'Large lockup' },
    { px: 96, use: 'App tile' },
];

const VARIANTS = [
    { variant: 'lemon', name: 'Lemon', use: 'The default, on plain grounds in light and dark.' },
    { variant: 'ink', name: 'Ink', use: 'On Lemon and on any category field, where a Lemon tile would vanish.' },
    { variant: 'mono', name: 'Mono', use: 'One-color uses: print, embossing, watermarks. Takes the text color.' },
] as const;

const FILES = [
    { path: 'src/app/icon.svg', use: 'Browser favicon (SVG)' },
    { path: 'src/app/favicon.ico', use: 'Favicon fallback, 16, 32 and 48px' },
    { path: 'src/app/apple-icon.png', use: 'iOS home screen, 180px, full bleed' },
    { path: 'public/brand/frontpage-mark.svg', use: 'Mark, Lemon' },
    { path: 'public/brand/frontpage-mark-ink.svg', use: 'Mark, Ink' },
    { path: 'public/brand/frontpage-mark-mono.svg', use: 'Mark, one color' },
    { path: 'public/brand/frontpage-mark-512.png', use: 'Mark raster, 512px' },
    { path: 'public/brand/frontpage-app-icon.svg', use: 'App icon, full bleed for masked platforms' },
    { path: 'public/brand/frontpage-app-icon-512.png', use: 'App icon raster, 512px' },
];

// Renders the logo section.
export function LogoSection() {
    return (
        <DocSection
            id="logo"
            title="Logo"
            intro="The mark is an F built from two feed rows, with the unread dot beside the second: a front page with something new on it. It sits on a softly rounded Lemon tile, the brand color no category may use. The wordmark is Bricolage Grotesque ExtraBold, set as real text."
        >
            <Specimen title="Lockup" stage="none" description="Pick the version by what it sits on, never by taste.">
                <ul className="grid gap-3 lg:grid-cols-3">
                    {GROUNDS.map((ground) => (
                        <li
                            key={ground.name}
                            className="flex min-h-44 flex-col justify-between rounded-stage border border-edge p-6"
                            style={{ background: ground.background, color: ground.ink }}
                        >
                            <Logo size="md" variant={ground.variant} />
                            <span className="text-meta">
                                <span className="block font-semibold">{ground.name}</span>
                                {ground.note}
                            </span>
                        </li>
                    ))}
                </ul>
            </Specimen>

            <Specimen title="Mark sizes" description="Below 16px the dot closes up; never set the mark smaller.">
                <ul className="flex flex-wrap items-end gap-x-10 gap-y-6">
                    {MARK_SIZES.map((step) => (
                        <li key={step.px} className="flex flex-col items-start gap-3">
                            <LogoMark size={step.px} />
                            <span className="text-meta">
                                <span className="block font-semibold tabular-nums">{step.px}px</span>
                                <span className="text-ink-2">{step.use}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </Specimen>

            <div className="grid gap-14 xl:grid-cols-2 xl:gap-x-10">
                <Specimen title="Variants">
                    <ul className="grid gap-6 sm:grid-cols-3">
                        {VARIANTS.map((entry) => (
                            <li key={entry.variant} className="flex flex-col gap-3">
                                <LogoMark size={48} variant={entry.variant} />
                                <span className="text-meta">
                                    <span className="block font-semibold">{entry.name}</span>
                                    <span className="text-ink-2">{entry.use}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </Specimen>

                <Specimen title="Rules">
                    <ul className="list-disc space-y-2 pl-5 text-ui text-ink-2 marker:text-ink">
                        <li>Clear space on every side equals the dot&apos;s diameter at the size you use.</li>
                        <li>Smallest mark 16px; smallest lockup 20px tall.</li>
                        <li>Never recolor the tile with a category field: Lemon belongs to Frontpage.</li>
                        <li>Never stretch, rotate, outline or add effects. Never set the wordmark in another face.</li>
                    </ul>
                </Specimen>
            </div>

            <Specimen title="Files" stage="none">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="rule-b text-meta text-ink-2">
                            <th scope="col" className="py-2 pr-4 font-semibold">
                                File
                            </th>
                            <th scope="col" className="py-2 font-semibold">
                                Use
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {FILES.map((file) => (
                            <tr key={file.path} className="border-b border-rule-soft">
                                <td className="py-2.5 pr-4">
                                    <code className="text-meta">{file.path}</code>
                                </td>
                                <td className="py-2.5 text-ui text-ink-2">{file.use}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Specimen>
        </DocSection>
    );
}
