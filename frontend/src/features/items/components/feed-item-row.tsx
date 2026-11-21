// One row of the feed list: time, title, category tag and source, and a status column for New and feed health.
// Renders an <li>; the caller provides the <ul> (opened with the ink rule, `rule-t`). Row padding follows --density.
// The title link stretches over the whole row, so the row is the target; the row, not the title, shows focus.
// `isSelected` marks the item open in the reading pane beside the list.

import { HealthMark, type FeedHealth } from '@/components/ui/health-mark';
import { CategoryTag, NewTag } from '@/components/ui/tags';

type FeedItemRowProps = {
    title: string;
    href: string;
    source: string;
    time: string;
    isNew: boolean;
    health: FeedHealth;
    category: { name: string; field: { color: string } };
    isSelected?: boolean;
};

const ROW_GRID =
    'grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 border-b border-rule-soft px-3 py-[calc(var(--density)*1.125rem)] sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]';

// Renders the row; unread items get a semibold title and the New tag, unhealthy feeds show their health mark, and the
// selected item gets a ground-2 fill inside an ink frame.
export function FeedItemRow({ title, href, source, time, isNew, health, category, isSelected = false }: FeedItemRowProps) {
    const selectedClasses = isSelected ? 'bg-ground-2 outline-[1.5px] -outline-offset-[1.5px] outline-ink' : 'hover:bg-ground-2';

    return (
        <li
            className={`group relative ${ROW_GRID} transition-colors has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-(--color-focus) ${selectedClasses}`}
        >
            <span className="pt-1 text-meta tabular-nums text-muted">{time}</span>
            <div className="min-w-0">
                <a
                    href={href}
                    aria-current={isSelected ? 'true' : undefined}
                    className={`type-title after:absolute after:inset-0 after:content-[''] focus-visible:shadow-none focus-visible:outline-none group-hover:underline ${isNew ? 'font-semibold' : 'font-normal text-ink-2'}`}
                >
                    {title}
                </a>
                <p className="mt-[calc(var(--density)*0.5rem)] flex flex-wrap items-center gap-x-3 gap-y-2 text-meta text-ink-2">
                    <CategoryTag name={category.name} field={category.field} />
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

// Renders a placeholder row while items load: rule-soft bars where the time, title and tag will be. Decorative; the
// list around it carries aria-busy and a visually hidden "Loading items" line.
export function FeedItemSkeleton() {
    return (
        <li aria-hidden="true" className={ROW_GRID}>
            <span className="mt-1.5 h-3 w-10 rounded-tag bg-rule-soft" />
            <div className="min-w-0 space-y-2.5">
                <span className="block h-5 w-11/12 rounded-tag bg-rule-soft" />
                <span className="block h-5 w-2/3 rounded-tag bg-rule-soft" />
                <span className="mt-[calc(var(--density)*0.75rem)] block h-6 w-24 rounded-tag bg-rule-soft" />
            </div>
        </li>
    );
}
