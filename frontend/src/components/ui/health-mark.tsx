// Feed health as line form and colour, with a label that always spells the state out.

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

export function HealthMark({ health, showLabel = true }: { health: FeedHealth; showLabel?: boolean }) {
    const label = HEALTH_LABELS[health];

    return (
        <span className={`inline-flex items-center gap-2 text-meta ${HEALTH_COLORS[health]}`}>
            <span className="health-line" data-health={health} aria-hidden="true" />
            {showLabel ? label : <span className="sr-only">Feed {label.toLowerCase()}</span>}
        </span>
    );
}
