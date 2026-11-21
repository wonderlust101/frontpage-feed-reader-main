// Category filter: one capsule per category, any number on at once. Controlled: the parent owns which ids are selected.

import { Capsule } from '@/components/ui/capsule';
import type { Field } from '@/features/categories/fields';

type FilterCategory = {
    id: string;
    name: string;
    field: Pick<Field, 'id' | 'color' | 'onColor'>;
};

type CategoryFilterProps = {
    categories: FilterCategory[];
    selected: string[];
    onToggle: (id: string) => void;
    label?: string;
};

// Renders the capsule group; `field` is each category's field, `onToggle` receives the clicked category's id.
export function CategoryFilter({ categories, selected, onToggle, label = 'Filter by category' }: CategoryFilterProps) {
    return (
        <div role="group" aria-label={label} className="flex flex-wrap gap-3">
            {categories.map((category) => (
                <Capsule key={category.id} field={category.field} on={selected.includes(category.id)} onClick={() => onToggle(category.id)}>
                    {category.name}
                </Capsule>
            ))}
        </div>
    );
}
