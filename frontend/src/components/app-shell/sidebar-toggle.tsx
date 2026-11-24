'use client';

// The choice is a saved preference set on <html> before the first paint, so the panel never flashes open.

import { useEffect } from 'react';
import { Icon } from '@/components/ui/icon';
import { createHtmlPreference } from '@/lib/html-preference';
import { SAVED_PREFERENCES } from '@/lib/saved-preferences';
import { RailTooltip } from './rail-tooltip';

export const useSidebar = createHtmlPreference(SAVED_PREFERENCES.sidebar);

export function SidebarToggle({ panelId }: { panelId: string }) {
    const [sidebar, setSidebar] = useSidebar();
    const isCollapsed = sidebar === 'collapsed';
    const action = isCollapsed ? 'Show categories' : 'Hide categories';
    const nextChoice = isCollapsed ? 'auto' : 'collapsed';

    useEffect(() => {
        // Toggles on [ outside text fields, so typing a bracket in search or a form never moves the sidebar.
        function toggleOnBracket(event: KeyboardEvent) {
            const isTyping =
                event.target instanceof HTMLElement && (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName));

            if (event.key === '[' && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey)
                setSidebar(nextChoice);
        }

        window.addEventListener('keydown', toggleOnBracket);

        return () => window.removeEventListener('keydown', toggleOnBracket);
    }, [nextChoice, setSidebar]);

    return (
        <button
            type="button"
            aria-controls={panelId}
            aria-expanded={!isCollapsed}
            aria-keyshortcuts="["
            onClick={() => setSidebar(nextChoice)}
            className="group relative grid size-11 place-items-center rounded-control text-ink-2 transition-colors duration-150 hover:bg-ink/6 hover:text-ink"
        >
            <Icon name={isCollapsed ? 'sidebar-open' : 'sidebar-close'} />
            <span className="sr-only">{action}</span>
            <RailTooltip>
                {action} <kbd className="ml-1 rounded-tag border border-on-ink/30 px-1.5 font-sans">[</kbd>
            </RailTooltip>
        </button>
    );
}
