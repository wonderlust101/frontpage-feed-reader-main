// Lemon is Frontpage's own colour, yet readers may give it to categories too. NO_FIELD ("No color") behaves exactly
// like the coloured fields, so PICKABLE_FIELDS lists it first. `onColor` is the text colour on a filled surface.

export type FieldId = 'lemon' | 'coral' | 'sky' | 'leaf' | 'lilac' | 'tangerine' | 'aqua' | 'rose' | 'none';

export type Field = {
    id: FieldId;
    name: string;
    color: string;
    onColor: string;
    hex: { light: string; dark: string };
    inkContrast: { light: string; dark: string };
};

// A category as the capsule filter and switch draw it.
export type CapsuleCategory = { id: string; name: string; field: Pick<Field, 'id' | 'color' | 'onColor'> };

export type FieldChoices = Record<string, FieldId>;

const ON_FIELD = 'var(--color-on-field)';

export const FIELDS: Field[] = [
    {
        id: 'lemon',
        name: 'Lemon',
        color: 'var(--color-field-lemon)',
        onColor: ON_FIELD,
        hex: { light: '#FFD000', dark: '#FFD000' },
        inkContrast: { light: '13.5 : 1', dark: '13.5 : 1' },
    },
    {
        id: 'coral',
        name: 'Coral',
        color: 'var(--color-field-coral)',
        onColor: ON_FIELD,
        hex: { light: '#FF756E', dark: '#FF756E' },
        inkContrast: { light: '7.6 : 1', dark: '7.6 : 1' },
    },
    {
        id: 'sky',
        name: 'Sky',
        color: 'var(--color-field-sky)',
        onColor: ON_FIELD,
        hex: { light: '#04ACFB', dark: '#04ACFB' },
        inkContrast: { light: '7.8 : 1', dark: '7.8 : 1' },
    },
    {
        id: 'leaf',
        name: 'Leaf',
        color: 'var(--color-field-leaf)',
        onColor: ON_FIELD,
        hex: { light: '#63DE44', dark: '#63DE44' },
        inkContrast: { light: '11.4 : 1', dark: '11.4 : 1' },
    },
    {
        id: 'lilac',
        name: 'Lilac',
        color: 'var(--color-field-lilac)',
        onColor: ON_FIELD,
        hex: { light: '#C085FE', dark: '#C085FE' },
        inkContrast: { light: '7.6 : 1', dark: '7.6 : 1' },
    },
    {
        id: 'tangerine',
        name: 'Tangerine',
        color: 'var(--color-field-tangerine)',
        onColor: ON_FIELD,
        hex: { light: '#FD9305', dark: '#FD9305' },
        inkContrast: { light: '8.8 : 1', dark: '8.8 : 1' },
    },
    {
        id: 'aqua',
        name: 'Aqua',
        color: 'var(--color-field-aqua)',
        onColor: ON_FIELD,
        hex: { light: '#0BDAC9', dark: '#0BDAC9' },
        inkContrast: { light: '11.2 : 1', dark: '11.2 : 1' },
    },
    {
        id: 'rose',
        name: 'Rose',
        color: 'var(--color-field-rose)',
        onColor: ON_FIELD,
        hex: { light: '#FE6AB9', dark: '#FE6AB9' },
        inkContrast: { light: '7.5 : 1', dark: '7.5 : 1' },
    },
];

export const BRAND_FIELD = FIELDS[0];

export const NO_FIELD: Field = {
    id: 'none',
    name: 'No color',
    color: 'var(--color-field-none)',
    onColor: ON_FIELD,
    hex: { light: '#CBCBC3', dark: '#CBCBC3' },
    inkContrast: { light: '12.1 : 1', dark: '12.1 : 1' },
};

export const PICKABLE_FIELDS = [NO_FIELD, ...FIELDS];

const FIELD_BY_ID = new Map<string, Field>(PICKABLE_FIELDS.map((field) => [field.id, field]));

// The reader's choice, else the category's preset, else "No color".
export function assignFields(categoryIds: string[], choices: FieldChoices, presets: FieldChoices = {}): Record<string, Field> {
    return Object.fromEntries(categoryIds.map((id) => [id, categoryFieldById(choices[id]) ?? categoryFieldById(presets[id]) ?? NO_FIELD]));
}

export function categoryFieldById(id: string | undefined): Field | undefined {
    return id ? FIELD_BY_ID.get(id) : undefined;
}

// "No color" for a missing or unknown id.
export function fieldOrNone(id: string | undefined): Field {
    return categoryFieldById(id) ?? NO_FIELD;
}
