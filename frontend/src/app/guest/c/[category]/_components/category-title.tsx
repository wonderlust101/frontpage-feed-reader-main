'use client';

// A guest category's page title, underlined in the category's field: its preset, or the color the guest chose for it.

import { useGuestCategoryFields } from '@/features/categories/use-guest-category-fields';

// Renders the h1 for the category `id`.
export function CategoryTitle({ id, name }: { id: string; name: string }) {
    const [fields] = useGuestCategoryFields();

    return (
        <h1
            className="self-start type-headline underline decoration-[0.12em] underline-offset-[0.16em] [text-decoration-skip-ink:none]"
            style={{ textDecorationColor: fields[id].color }}
        >
            {name}
        </h1>
    );
}
