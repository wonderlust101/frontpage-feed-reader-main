// Small inline labels: a category tag filled with its field color, and the solid ink "New" tag for unread items.
// Both always carry text, so color is never the only signal. Their transparent border only shows in forced-colors
// mode, where it keeps the label's shape once fills are dropped.

const TAG_CLASSES = 'inline-flex h-7 items-center rounded-tag border border-transparent px-3 text-small font-semibold';

// Renders a category name as a flat label filled with its field ("No color" is the stone field); no outline, because
// tags are not clickable.
export function CategoryTag({ name, field }: { name: string; field: { color: string } }) {
    return (
        <span className={`${TAG_CLASSES} fill-edge text-on-field`} style={{ background: field.color }}>
            {name}
        </span>
    );
}

// Renders the "New" tag shown on unread items, next to a bolder title.
export function NewTag() {
    return <span className={`${TAG_CLASSES} bg-ink font-bold text-ground`}>New</span>;
}
