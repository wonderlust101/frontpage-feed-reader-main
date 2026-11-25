'use client';

// The choice is a saved preference set on <html> before the first paint, so the panel never flashes open.

import { useEffect } from 'react';
import { Icon } from '@/components/ui/icon';
import { createHtmlPreference } from '@/lib/html-preference';
import { SAVED_PREFERENCES } from '@/lib/saved-preferences';
import { isTypingTarget } from '@/lib/typing-target';
import { RAIL_BUTTON_CLASSES, RAIL_IDLE_CLASSES } from './rail-styles';
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
            if (event.key === '[' && !isTypingTarget(event.target) && !event.metaKey && !event.ctrlKey && !event.altKey)
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
            className={`${RAIL_BUTTON_CLASSES} ${RAIL_IDLE_CLASSES}`}
        >
            <Icon name={isCollapsed ? 'sidebar-open' : 'sidebar-close'} />
            <span className="sr-only">{action}</span>
            <RailTooltip>
                {action} <kbd className="ml-1 rounded-tag border border-on-ink/30 px-1.5 font-sans">[</kbd>
            </RailTooltip>
        </button>
    );
}
