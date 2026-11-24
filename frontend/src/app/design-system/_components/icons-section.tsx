import { Icon, type IconName } from '@/components/ui/icon';
import { DocSection, Specimen } from './doc-section';

type IconGroup = {
    title: string;
    description: string;
    items: [IconName, string][];
};

const ICON_GROUPS: IconGroup[] = [
    {
        title: 'Navigation',
        description: 'Sidebar, top bar and moving between views.',
        items: [
            ['all-items', 'All items'],
            ['categories', 'Categories'],
            ['saved', 'Saved'],
            ['digest', 'Digest'],
            ['analytics', 'Analytics'],
            ['search', 'Search'],
            ['settings', 'Settings'],
            ['menu', 'Menu'],
            ['close', 'Close'],
            ['back', 'Back'],
            ['expand', 'Expand'],
            ['next', 'Next'],
        ],
    },
    {
        title: 'Feeds',
        description: 'Adding, organizing and maintaining sources.',
        items: [
            ['add-feed', 'Add feed'],
            ['feed', 'RSS feed'],
            ['newsletter', 'Newsletter'],
            ['website', 'Website'],
            ['edit', 'Edit'],
            ['delete', 'Delete / unsubscribe'],
            ['import-opml', 'Import OPML'],
            ['export-opml', 'Export OPML'],
            ['refresh', 'Refresh'],
            ['reorder', 'Reorder'],
            ['more', 'More actions'],
            ['filter', 'Filter'],
            ['sort', 'Sort'],
        ],
    },
    {
        title: 'Reading',
        description: 'Actions on an item, in the list and in the article view.',
        items: [
            ['mark-read', 'Mark read'],
            ['mark-unread', 'Mark unread'],
            ['mark-all-read', 'Mark all read'],
            ['save', 'Save for later'],
            ['saved-item', 'Saved'],
            ['share', 'Share'],
            ['copy-link', 'Copy link'],
            ['copy', 'Copy'],
            ['open-original', 'Open original'],
            ['reading-time', 'Reading time'],
            ['hide-read', 'Hide read'],
            ['show-read', 'Show read'],
            ['undo', 'Undo'],
        ],
    },
    {
        title: 'Reading settings',
        description: 'The reader settings and accessibility preferences.',
        items: [
            ['text-size', 'Text size'],
            ['reading-face', 'Reading face'],
            ['density', 'Density'],
            ['theme-light', 'Light theme'],
            ['theme-dark', 'Dark theme'],
            ['theme-auto', 'Auto theme'],
            ['accessibility', 'Accessibility'],
        ],
    },
    {
        title: 'AI and analytics',
        description: 'Summaries, tagging and reading habits.',
        items: [
            ['ai-summary', 'AI summary'],
            ['auto-tag', 'Auto-tag'],
            ['highlights', 'Weekly highlights'],
            ['suggestion', 'Suggestion'],
            ['streak', 'Reading streak'],
            ['reading-chart', 'Reads over time'],
            ['heatmap', 'Activity heatmap'],
            ['export-data', 'Export data'],
        ],
    },
    {
        title: 'Status',
        description: 'Feed health, feedback and system state. Always paired with a text label.',
        items: [
            ['healthy', 'Healthy / success'],
            ['stale', 'Stale'],
            ['failing', 'Failing'],
            ['error', 'Error'],
            ['dismiss', 'Dismiss'],
            ['info', 'Info'],
            ['offline', 'Offline'],
            ['loading', 'Loading'],
            ['notification', 'New items'],
        ],
    },
    {
        title: 'Account and help',
        description: 'Signing in, the guest session and getting help.',
        items: [
            ['account', 'Account'],
            ['guest', 'Guest'],
            ['sign-in', 'Sign in'],
            ['sign-out', 'Sign out'],
            ['shortcuts', 'Keyboard shortcuts'],
            ['help', 'Help'],
        ],
    },
    {
        title: 'Empty states',
        description: 'Shown large, above a sentence that says what happened and what to do next.',
        items: [
            ['empty-inbox', 'No feeds yet'],
            ['empty-folder', 'Empty category'],
            ['no-results', 'No search results'],
            ['caught-up', 'All caught up'],
        ],
    },
];

const SIZE_SCALE: { size: 'inline' | 'action' | 'nav'; px: number; use: string }[] = [
    { size: 'inline', px: 16, use: 'Inline with metadata and tags' },
    { size: 'action', px: 20, use: 'Buttons and item actions' },
    { size: 'nav', px: 24, use: 'Navigation and empty states' },
];

export function IconsSection() {
    return (
        <DocSection
            id="icons"
            title="Icons"
            intro="Lucide icons at one stroke weight, 1.75px at every size, drawn in the current text color. Call sites use app names like mark-read, never the drawing's name. An icon always sits beside a text label or carries an accessible name; it never carries meaning alone."
        >
            <Specimen title="Sizes">
                <ul className="grid gap-6 sm:grid-cols-3">
                    {SIZE_SCALE.map((step) => (
                        <li key={step.size} className="flex items-center gap-4">
                            <span className="grid size-12 place-items-center rounded-control border border-edge bg-ground">
                                <Icon name="saved" size={step.size} />
                            </span>
                            <span>
                                <span className="block text-ui font-semibold">
                                    {step.px}px · {step.size}
                                </span>
                                <span className="block text-meta text-ink-2">{step.use}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </Specimen>

            <div className="grid gap-14 2xl:grid-cols-2 2xl:gap-x-10">
                {ICON_GROUPS.map((group) => (
                    <Specimen key={group.title} title={group.title} description={group.description}>
                        <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
                            {group.items.map(([name, label]) => (
                                <li key={name} className="flex items-center gap-3 rounded-toggle px-2 py-2.5 transition-colors hover:bg-ground">
                                    <Icon name={name} size="nav" />
                                    <span className="min-w-0">
                                        <span className="block text-ui leading-tight font-semibold">{label}</span>
                                        <code className="block text-meta text-muted">{name}</code>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </Specimen>
                ))}
            </div>
        </DocSection>
    );
}
