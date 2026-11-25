import type { ReactNode } from 'react';

type FieldTitleProps = {
    as?: 'h1' | 'span';
    color: string;
    className?: string;
    children: ReactNode;
};

const FIELD_TITLE_CLASSES = 'field-underline underline decoration-[0.12em] [text-decoration-skip-ink:none]';

// A title underlined in a category's field color; `className` sets its type role and offset.
export function FieldTitle({ as: Tag = 'span', color, className = '', children }: FieldTitleProps) {
    return (
        <Tag className={`${FIELD_TITLE_CLASSES} ${className}`} style={{ '--title-field': color }}>
            {children}
        </Tag>
    );
}
