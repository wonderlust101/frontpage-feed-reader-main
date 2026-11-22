// The field palette: eight flat colors. Lemon is Frontpage's own color (the home field, "All", brand accents), and
// readers may give it to categories too, like any of the other seven, whatever they are about: "Film" or "Politics".
// Categories may share a color. A new category starts on NO_FIELD ("No color"), a neutral stone field that behaves
// exactly like the colored ones (filled tag, filled dot, filled when on); PICKABLE_FIELDS lists it first for that reason.
// A field's `onColor` is the text color on a surface filled with it; FieldChoices maps category ids to chosen fields.

export type FieldId = 'lemon' | 'coral' | 'sky' | 'leaf' | 'lilac' | 'tangerine' | 'aqua' | 'rose' | 'none';

export type Field = {
    id: FieldId;
    name: string;
    color: string;
    onColor: string;
    hex: { light: string; dark: string };
    inkContrast: { light: string; dark: string };
};

export type FieldChoices = Record<string, FieldId>;

const ON_FIELD = 'var(--color-on-field)';

export const FIELDS: Field[] = [
    {
        id: 'lemon',
        name: 'Lemon',
        color: 'var(--color-field-lemon)',
        onColor: ON_FIELD,
        hex: { light: '#FFE500', dark: '#FFD000' },
        inkContrast: { light: '15.5 : 1', dark: '13.5 : 1' },
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

export const CATEGORY_FIELDS = FIELDS;

export const NO_FIELD: Field = {
    id: 'none',
    name: 'No color',
    color: 'var(--color-field-none)',
    onColor: ON_FIELD,
    hex: { light: '#CBCBC3', dark: '#CBCBC3' },
    inkContrast: { light: '12.1 : 1', dark: '12.1 : 1' },
};

export const PICKABLE_FIELDS = [NO_FIELD, ...CATEGORY_FIELDS];

const FIELD_BY_ID = new Map<FieldId, Field>(PICKABLE_FIELDS.map((field) => [field.id, field]));

// Gives each category its field: the reader's choice, else the category's preset (sample data), else "No color".
// Any number of categories may share a field.
export function assignFields(categoryIds: string[], choices: FieldChoices, presets: FieldChoices = {}): Record<string, Field> {
    return Object.fromEntries(categoryIds.map((id) => [id, categoryFieldById(choices[id]) ?? categoryFieldById(presets[id]) ?? NO_FIELD]));
}

// Returns the field a category may be given, or undefined for unknown ids.
export function categoryFieldById(id: string | undefined): Field | undefined {
    return id ? FIELD_BY_ID.get(id as FieldId) : undefined;
}
