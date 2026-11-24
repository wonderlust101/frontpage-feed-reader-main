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
