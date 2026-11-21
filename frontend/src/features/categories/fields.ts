// The field palette: eight flat colors. Lemon is Frontpage's own color (the home field, "All", brand accents);
// categories take the other seven, one each, whatever they are about: "Film" or "Politics" just like "Frontend".

export type FieldId = 'lemon' | 'coral' | 'sky' | 'leaf' | 'lilac' | 'tangerine' | 'aqua' | 'rose';

export type Field = {
    id: FieldId;
    name: string;
    color: string;
    hex: string;
    inkContrast: string;
};

export const FIELDS: Field[] = [
    { id: 'lemon', name: 'Lemon', color: 'var(--color-field-lemon)', hex: '#F5E211', inkContrast: '14.9 : 1' },
    { id: 'coral', name: 'Coral', color: 'var(--color-field-coral)', hex: '#FF756E', inkContrast: '7.6 : 1' },
    { id: 'sky', name: 'Sky', color: 'var(--color-field-sky)', hex: '#04ACFB', inkContrast: '7.8 : 1' },
    { id: 'leaf', name: 'Leaf', color: 'var(--color-field-leaf)', hex: '#63DE44', inkContrast: '11.4 : 1' },
    { id: 'lilac', name: 'Lilac', color: 'var(--color-field-lilac)', hex: '#C085FE', inkContrast: '7.6 : 1' },
    { id: 'tangerine', name: 'Tangerine', color: 'var(--color-field-tangerine)', hex: '#FD9305', inkContrast: '8.8 : 1' },
    { id: 'aqua', name: 'Aqua', color: 'var(--color-field-aqua)', hex: '#0BDAC9', inkContrast: '11.2 : 1' },
    { id: 'rose', name: 'Rose', color: 'var(--color-field-rose)', hex: '#FE6AB9', inkContrast: '7.5 : 1' },
];

export const BRAND_FIELD = FIELDS[0];

export const CATEGORY_FIELDS = FIELDS.filter((field) => field.id !== BRAND_FIELD.id);

// Returns the field a new category should take: the first category field no category uses yet, or, when all seven
// are taken, the category fields again in order (the eighth category gets Coral). Never returns the brand's Lemon.
export function nextField(taken: FieldId[]): Field {
    const free = CATEGORY_FIELDS.find((field) => !taken.includes(field.id));
    return free ?? CATEGORY_FIELDS[taken.length % CATEGORY_FIELDS.length];
}
