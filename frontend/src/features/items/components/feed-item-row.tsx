// One row of the feed list: time, title, category tag and source, and a status column for New and feed health.
// Renders an <li>; the caller provides the <ul> (opened with a 2px ink rule). Row padding follows --density.

import { HealthMark, type FeedHealth } from '@/components/ui/health-mark';
import { CategoryTag, NewTag } from '@/components/ui/tags';

type FeedItemRowProps = {
    title: string;
    href: string;
    source: string;
    time: string;
    isNew: boolean;
    health: FeedHealth;
    category: { name: string; color: string };
};

// Renders the row; unread items get a semibold title and the New tag, unhealthy feeds show their health mark.
export function FeedItemRow({ title, href, source, time, isNew, health, category }: FeedItemRowProps) {
    return (
        <li className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 border-b border-rule-soft py-[calc(var(--density)*1.125rem)] transition-colors hover:bg-ground-2 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]">
            <span className="pt-1 text-meta tabular-nums text-muted">{time}</span>
            <div className="min-w-0">
                <a
                    href={href}
                    className={`font-display text-title leading-[1.2] tracking-[-0.015em] hover:underline ${isNew ? 'font-semibold' : 'font-normal text-ink-2'}`}
                >
                    {title}
                </a>
                <p className="mt-[calc(var(--density)*0.5rem)] flex flex-wrap items-center gap-x-3 gap-y-2 text-meta text-ink-2">
                    <CategoryTag name={category.name} field={category.color} />
                    <span>{source}</span>
                </p>
            </div>
            <div className="col-start-2 mt-3 flex min-h-7 items-center gap-3 sm:col-start-3 sm:mt-0 sm:w-28 sm:flex-col sm:items-end sm:justify-between sm:gap-2">
                {isNew && <NewTag />}
                {health !== 'healthy' && <HealthMark health={health} />}
            </div>
        </li>
    );
}
