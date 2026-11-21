// Category filter: one capsule per category, any number on at once. Controlled: the parent owns which ids are selected.

import { Capsule } from '@/components/ui/capsule';

type FilterCategory = {
    id: string;
    name: string;
    color: string;
};

type CategoryFilterProps = {
    categories: FilterCategory[];
    selected: string[];
    onToggle: (id: string) => void;
    label?: string;
};

// Renders the capsule group; `color` is each category's field color, `onToggle` receives the clicked category's id.
export function CategoryFilter({ categories, selected, onToggle, label = 'Filter by category' }: CategoryFilterProps) {
    return (
        <div role="group" aria-label={label} className="flex flex-wrap gap-3">
            {categories.map((category) => (
                <Capsule key={category.id} field={category.color} pressed={selected.includes(category.id)} onClick={() => onToggle(category.id)}>
                    {category.name}
                </Capsule>
            ))}
        </div>
    );
}
