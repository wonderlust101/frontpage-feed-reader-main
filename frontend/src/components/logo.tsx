// Mark variants keep the logo visible on any ground: "lemon" on plain grounds, "ink" on Lemon or category fields,
// "mono" (current text color) for one-color uses.

type MarkVariant = 'lemon' | 'ink' | 'mono';

type LogoSize = 'sm' | 'md' | 'lg';

type LogoMarkProps = {
    size?: number;
    variant?: MarkVariant;
    label?: string;
    className?: string;
};

type LogoProps = {
    size?: LogoSize;
    variant?: MarkVariant;
    className?: string;
};

const MARK_COLORS: Record<MarkVariant, { tile: string; glyph: string }> = {
    lemon: { tile: 'var(--color-field-lemon)', glyph: 'var(--color-on-field)' },
    ink: { tile: 'var(--color-on-field)', glyph: 'var(--color-field-lemon)' },
    mono: { tile: 'none', glyph: 'currentColor' },
};

const LOCKUP_SIZES: Record<LogoSize, { mark: number; text: string; gap: string }> = {
    sm: { mark: 20, text: '1.125rem', gap: '0.375rem' },
    md: { mark: 28, text: '1.5rem', gap: '0.5rem' },
    lg: { mark: 56, text: '3rem', gap: '0.875rem' },
};

// Decorative unless `label` is given.
export function LogoMark({ size = 32, variant = 'lemon', label, className = '' }: LogoMarkProps) {
    const colors = MARK_COLORS[variant];

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            role={label ? 'img' : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
            className={`flex-none ${className}`}
            style={{ width: `${size / 16}rem`, height: `${size / 16}rem` }}
        >
            {variant !== 'mono' && <rect width="32" height="32" rx="7" fill={colors.tile} />}
            <g fill={colors.glyph}>
                <rect x="8" y="7" width="5" height="18" rx="1" />
                <rect x="8" y="7" width="16" height="5" rx="2.5" />
                <rect x="8" y="14.5" width="10" height="5" rx="2.5" />
                <circle cx="22.5" cy="17" r="2.5" />
            </g>
        </svg>
    );
}

// The wordmark is real text, so the lockup reads as "Frontpage".
export function Logo({ size = 'md', variant = 'lemon', className = '' }: LogoProps) {
    const lockup = LOCKUP_SIZES[size];

    return (
        <span className={`inline-flex items-center ${className}`} style={{ gap: lockup.gap }}>
            <LogoMark size={lockup.mark} variant={variant} />
            <span className="font-display leading-none font-extrabold tracking-[-0.03em] [font-variation-settings:'opsz'_96]" style={{ fontSize: lockup.text }}>
                Frontpage
            </span>
        </span>
    );
}
