// The article reading column: category and source line, title, optional AI summary, then the body.
// The body follows the reader settings (face, size, line height) and is capped at the 66-character measure.

import type { ReactNode } from 'react';
import { AiSummary } from '@/components/ui/ai-summary';
import { CategoryTag } from '@/components/ui/tags';

type ArticleViewProps = {
    id?: string;
    title: string;
    titleAs?: 'h1' | 'h2' | 'h3' | 'h4';
    category: { name: string; field: { color: string } };
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
                <CategoryTag name={category.name} field={category.field} />
                <span>{source}</span>
                <span className="tabular-nums text-muted">{meta}</span>
            </p>
            <Title className="mt-4 type-headline">{title}</Title>
            {summary && (
                <div className="mt-6">
                    <AiSummary>{summary}</AiSummary>
                </div>
            )}
            <div className="mt-8 space-y-[1em] type-body">{children}</div>
        </article>
    );
}
