// The coastline: the swelling bottom edge of a color field (the design system hero, the auth pages' band). It is drawn
// in currentColor, so it takes the field's color from its parent, and stretches to any width.

type CoastlineProps = {
    className?: string;
};

const COAST_PATH = 'M0 0H1440V52C1300 108 1150 148 970 146C790 144 680 84 510 86C340 88 190 146 0 120Z';

// Renders the decorative edge; `className` sets its height (it is always full width).
export function Coastline({ className = '' }: CoastlineProps) {
    return (
        <svg aria-hidden="true" className={`block w-full ${className}`} viewBox="0 0 1440 150" preserveAspectRatio="none">
            <path d={COAST_PATH} fill="currentColor" />
        </svg>
    );
}
