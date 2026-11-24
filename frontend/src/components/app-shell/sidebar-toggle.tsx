'use client';

// The choice is a saved preference set on <html> before the first paint, so the panel never flashes open.

import { useEffect, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { createHtmlPreference } from '@/lib/html-preference';
import { SAVED_PREFERENCES } from '@/lib/saved-preferences';

export const useSidebar = createHtmlPreference(SAVED_PREFERENCES.sidebar);

export function SidebarToggle({ panelId }: { panelId: string }) {
    const [sidebar, setSidebar] = useSidebar();
    const isCollapsed = sidebar === 'collapsed';
    const action = isCollapsed ? 'Show categories' : 'Hide categories';

    useEffect(() => {
        // Toggles on [ outside text fields, so typing a bracket in search or a form never moves the sidebar.
        function toggleOnBracket(event: KeyboardEvent) {
            const isTyping =
                event.target instanceof HTMLElement && (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName));

            if (event.key === '[' && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey)
                setSidebar(isCollapsed ? 'auto' : 'collapsed');
        }
        window.addEventListener('keydown', toggleOnBracket);

        return () => window.removeEventListener('keydown', toggleOnBracket);
    }, [isCollapsed, setSidebar]);

    return (
        <button
            type="button"
            aria-controls={panelId}
            aria-expanded={!isCollapsed}
            aria-keyshortcuts="["
            onClick={() => setSidebar(isCollapsed ? 'auto' : 'collapsed')}
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

// Hidden from screen readers, which get the control's own name.
export function RailTooltip({ children }: { children: ReactNode }) {
    return (
        <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-full z-30 ml-2 -translate-y-1/2 rounded-toggle bg-on-field px-2.5 py-1.5 text-meta font-semibold whitespace-nowrap text-on-ink opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
            {children}
        </span>
    );
}
