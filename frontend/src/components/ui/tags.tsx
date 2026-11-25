// Tags always carry text, so color is never the only signal; the transparent border keeps their shape in
// forced-colors mode.

const TAG_CLASSES = 'inline-flex h-7 items-center rounded-tag border border-transparent px-3 text-small font-semibold';

// Not clickable, so no outline; a long name ends in an ellipsis when `className` caps the width.
export function CategoryTag({ name, field, className = '' }: { name: string; field: { color: string }; className?: string }) {
    return (
        <span className={`${TAG_CLASSES} fill-edge text-on-field ${className}`} style={{ background: field.color }}>
            <span className="truncate">{name}</span>
        </span>
    );
}

export function NewTag() {
    return <span className={`${TAG_CLASSES} bg-ink font-bold text-ground`}>New</span>;
}
