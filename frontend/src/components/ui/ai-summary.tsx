// AI-written summary, set apart from the author's words: its own panel, the AI icon and a label saying it may be wrong.

import type { ReactNode } from 'react';
import { Icon } from './icon';

// Renders the summary panel around `children`, the generated text.
export function AiSummary({ children }: { children: ReactNode }) {
    return (
        <aside aria-label="AI summary" className="rounded-xl border border-ink/10 bg-ground-2 px-5 py-4">
            <p className="flex items-center gap-2 text-meta font-semibold text-ink-2">
                <Icon name="ai-summary" size="inline" />
                AI summary · can miss nuance, read the source
            </p>
            <p className="mt-2 text-ui leading-[1.55] text-ink">{children}</p>
        </aside>
    );
}
