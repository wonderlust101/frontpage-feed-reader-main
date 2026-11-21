// Feed health shown as line form and color: a neutral solid line when healthy (nothing to do), an amber dashed line
// when stale, a red cross when failing. The label always spells the state out.

export type FeedHealth = 'healthy' | 'stale' | 'failing';

const HEALTH_COLORS: Record<FeedHealth, string> = {
    healthy: 'text-ink-2',
    stale: 'text-warning font-semibold',
    failing: 'text-error font-semibold',
};

const HEALTH_LABELS: Record<FeedHealth, string> = {
    healthy: 'Healthy',
    stale: 'Stale',
    failing: 'Failing',
};

// Renders the health mark with a visible label, or with a screen-reader-only label when `showLabel` is false.
export function HealthMark({ health, showLabel = true }: { health: FeedHealth; showLabel?: boolean }) {
    const label = HEALTH_LABELS[health];

    return (
        <span className={`inline-flex items-center gap-2 text-meta ${HEALTH_COLORS[health]}`}>
            <span className="health-line" data-health={health} aria-hidden="true" />
            {showLabel ? label : <span className="sr-only">Feed {label.toLowerCase()}</span>}
        </span>
    );
}
