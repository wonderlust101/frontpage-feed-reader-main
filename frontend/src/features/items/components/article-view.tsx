// The article reading column: category and source line, title, optional AI summary, then the body.
// The body follows the reading controls (face, size, line height) and is capped at the 66-character measure.

import type { ReactNode } from 'react';
import { AiSummary } from '@/components/ui/ai-summary';
import { CategoryTag } from '@/components/ui/tags';

type ArticleViewProps = {
    id?: string;
    title: string;
    titleAs?: 'h1' | 'h2' | 'h3' | 'h4';
    category: { name: string; color: string };
    source: string;
    meta: string;
    summary?: ReactNode;
    children: ReactNode;
};

// Renders the article; `titleAs` sets the heading level (h1 on an article page, lower when embedded), `meta` is the date and reading time.
export function ArticleView({ id, title, titleAs: Title = 'h1', category, source, meta, summary, children }: ArticleViewProps) {
    return (
        <article id={id} className="max-w-measure scroll-mt-24">
            <p className="flex flex-wrap items-center gap-3 text-meta text-ink-2">
                <CategoryTag name={category.name} field={category.color} />
                <span>{source}</span>
                <span className="tabular-nums text-muted">{meta}</span>
            </p>
            <Title className="mt-4 font-display text-headline leading-[1.1] font-semibold tracking-[-0.02em]">{title}</Title>
            {summary && (
                <div className="mt-6">
                    <AiSummary>{summary}</AiSummary>
                </div>
            )}
            <div className="mt-8 space-y-[1em] font-reading text-body leading-[var(--leading-body)]">{children}</div>
        </article>
    );
}
