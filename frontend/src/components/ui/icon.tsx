// Frontpage's icon set: Lucide icons behind app-level names, so call sites say what they mean ("mark-read")
// and the drawing can change in one place. One stroke weight everywhere (1.75px, absolute), in the current text color.

import {
    AArrowDown,
    AArrowUp,
    Accessibility,
    ALargeSmall,
    ArrowDown,
    ArrowDownUp,
    ArrowLeft,
    ArrowUp,
    BellRing,
    Bookmark,
    BookmarkCheck,
    BookmarkPlus,
    ChartColumn,
    Check,
    CheckCheck,
    ChevronDown,
    ChevronRight,
    CircleAlert,
    CircleCheck,
    CircleDot,
    CircleHelp,
    CircleUser,
    CircleX,
    Clock,
    Coffee,
    Copy,
    Download,
    Ellipsis,
    ExternalLink,
    Eye,
    EyeOff,
    FileDown,
    FileUp,
    Flame,
    FolderOpen,
    Globe,
    GripVertical,
    Grid3x3,
    Highlighter,
    Hourglass,
    Inbox,
    Info,
    Keyboard,
    LayoutList,
    Lock,
    PanelLeftClose,
    PanelLeftOpen,
    Lightbulb,
    Link,
    ListFilter,
    LoaderCircle,
    LogIn,
    LogOut,
    Mail,
    Menu,
    Moon,
    Newspaper,
    Pencil,
    Plus,
    RefreshCw,
    Rows3,
    Rss,
    Search,
    SearchX,
    Settings,
    Share2,
    Sparkles,
    Sun,
    SunMoon,
    Tag,
    Tags,
    Trash2,
    TriangleAlert,
    Type,
    Undo2,
    User,
    WifiOff,
    X,
    type LucideIcon,
} from 'lucide-react';

type IconSize = 'inline' | 'action' | 'nav';

type IconProps = {
    name: IconName;
    size?: IconSize;
    label?: string;
    className?: string;
};

export const ICONS = {
    'all-items': LayoutList,
    categories: Tags,
    saved: Bookmark,
    digest: Newspaper,
    analytics: ChartColumn,
    search: Search,
    settings: Settings,
    menu: Menu,
    locked: Lock,
    'sidebar-close': PanelLeftClose,
    'sidebar-open': PanelLeftOpen,
    close: X,
    back: ArrowLeft,
    expand: ChevronDown,
    next: ChevronRight,

    'add-feed': Plus,
    feed: Rss,
    newsletter: Mail,
    website: Globe,
    edit: Pencil,
    delete: Trash2,
    'import-opml': FileUp,
    'export-opml': FileDown,
    refresh: RefreshCw,
    reorder: GripVertical,
    'move-up': ArrowUp,
    'move-down': ArrowDown,
    more: Ellipsis,
    filter: ListFilter,
    sort: ArrowDownUp,

    'mark-read': Check,
    'mark-unread': CircleDot,
    'mark-all-read': CheckCheck,
    save: BookmarkPlus,
    'saved-item': BookmarkCheck,
    share: Share2,
    'copy-link': Link,
    copy: Copy,
    'open-original': ExternalLink,
    'reading-time': Clock,
    'hide-read': EyeOff,
    'show-read': Eye,
    undo: Undo2,

    'text-size': ALargeSmall,
    'text-smaller': AArrowDown,
    'text-larger': AArrowUp,
    'reading-face': Type,
    density: Rows3,
    'theme-light': Sun,
    'theme-dark': Moon,
    'theme-auto': SunMoon,
    accessibility: Accessibility,

    'ai-summary': Sparkles,
    'auto-tag': Tag,
    highlights: Highlighter,
    suggestion: Lightbulb,

    streak: Flame,
    'reading-chart': ChartColumn,
    heatmap: Grid3x3,
    'export-data': Download,

    healthy: CircleCheck,
    stale: Hourglass,
    failing: TriangleAlert,
    error: CircleAlert,
    dismiss: CircleX,
    info: Info,
    offline: WifiOff,
    loading: LoaderCircle,
    notification: BellRing,

    account: CircleUser,
    guest: User,
    'sign-in': LogIn,
    'sign-out': LogOut,
    'show-password': Eye,
    'hide-password': EyeOff,
    shortcuts: Keyboard,
    help: CircleHelp,

    'empty-inbox': Inbox,
    'empty-folder': FolderOpen,
    'no-results': SearchX,
    'caught-up': Coffee,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

const ICON_SIZES: Record<IconSize, { px: number; className: string }> = {
    inline: { px: 16, className: 'size-4' },
    action: { px: 20, className: 'size-5' },
    nav: { px: 24, className: 'size-6' },
};

// Renders an icon by its app-level name. Decorative (hidden from screen readers) unless `label` is given,
// in which case it is announced as an image with that name. Sizes: inline 16px, action 20px, nav 24px.
export function Icon({ name, size = 'action', label, className = '' }: IconProps) {
    const Glyph = ICONS[name];

    return (
        <Glyph
            size={ICON_SIZES[size].px}
            strokeWidth={1.75}
            absoluteStrokeWidth
            aria-hidden={label ? undefined : true}
            aria-label={label}
            role={label ? 'img' : undefined}
            className={`flex-none ${ICON_SIZES[size].className} ${className}`}
        />
    );
}
