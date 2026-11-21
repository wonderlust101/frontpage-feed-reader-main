// The app's sidebar: the views (all items, saved, digest, analytics) and the reader's categories, each with its unread
// count, then settings. The current view is marked with aria-current, bold ink and a ground-2 fill, never color alone.
// Feature-agnostic: categories come in as plain data, each with the CSS color of its field.

import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';

type SidebarView = { id: string; label: string; icon: IconName; unread?: number };

type SidebarCategory = { id: string; name: string; color: string; unread: number };

type AppSidebarProps = {
    views: SidebarView[];
    categories: SidebarCategory[];
    currentId: string;
};

const LINK_CLASSES = 'flex min-h-10 items-center gap-3 rounded-toggle px-3 text-ui hover:bg-ground-2';

// Renders the sidebar navigation; `currentId` is the id of the view or category on screen.
export function AppSidebar({ views, categories, currentId }: AppSidebarProps) {
    return (
        <nav aria-label="Feeds" className="flex flex-col gap-6">
            <ul className="space-y-0.5">
                {views.map((view) => (
                    <li key={view.id}>
                        <SidebarLink href={`#${view.id}`} isCurrent={view.id === currentId} unread={view.unread}>
                            <Icon name={view.icon} size="action" />
                            {view.label}
                        </SidebarLink>
                    </li>
                ))}
            </ul>
            <div>
                <p id="sidebar-categories" className="rule-t px-3 pt-3 pb-1 text-meta font-semibold text-ink-2">
                    Categories
                </p>
                <ul aria-labelledby="sidebar-categories" className="space-y-0.5">
                    {categories.map((category) => (
                        <li key={category.id}>
                            <SidebarLink href={`#${category.id}`} isCurrent={category.id === currentId} unread={category.unread}>
                                <span
                                    aria-hidden="true"
                                    className="fill-edge mx-[3px] size-3.5 flex-none rounded-full"
                                    style={{ background: category.color }}
                                />
                                {category.name}
                            </SidebarLink>
                        </li>
                    ))}
                </ul>
            </div>
            <a href="#settings" className={`${LINK_CLASSES} border-t border-rule-soft pt-2`}>
                <Icon name="settings" size="action" />
                Settings
            </a>
        </nav>
    );
}

type SidebarLinkProps = { href: string; isCurrent: boolean; unread?: number; children: ReactNode };

// Renders one sidebar entry with its unread count right-aligned in tabular figures.
function SidebarLink({ href, isCurrent, unread, children }: SidebarLinkProps) {
    return (
        <a
            href={href}
            aria-current={isCurrent ? 'page' : undefined}
            className={`${LINK_CLASSES} ${isCurrent ? 'bg-ground-2 font-semibold text-ink' : 'font-medium text-ink-2'}`}
        >
            {children}
            {unread !== undefined && unread > 0 && (
                <span className="ml-auto text-meta font-semibold tabular-nums">
                    {unread}
                    <span className="sr-only"> unread</span>
                </span>
            )}
        </a>
    );
}
