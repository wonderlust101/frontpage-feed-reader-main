// Small inline labels: a category tag filled with its field color, and the solid ink "New" tag for unread items.
// Both always carry text, so color is never the only signal.

// Renders a category name as a flat label filled with its field color; no outline, because tags are not clickable.
// `field` is a CSS color such as var(--color-field-coral).
export function CategoryTag({ name, field }: { name: string; field: string }) {
    return (
        <span className="inline-flex h-7 items-center rounded-md px-3 text-small font-semibold text-on-field" style={{ background: field }}>
            {name}
        </span>
    );
}

// Renders the "New" tag shown on unread items, next to a bolder title.
export function NewTag() {
    return <span className="inline-flex h-7 items-center rounded-md bg-ink px-3 text-small font-bold text-ground">New</span>;
}
