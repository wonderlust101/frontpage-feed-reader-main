// A guest's category colors as CSS custom properties on <html> (--category-<id>: var(--color-field-<field>)), so the
// shell can paint a chosen color on the first frame: the root layout's early script copies the saved choices before
// the first paint, and the store sets the property when a choice changes. Code that draws a category reads
// categoryColor(id, preset), which falls back to the preset until a choice exists.

import { PICKABLE_FIELDS, type FieldChoices } from './fields';

export const CATEGORY_FIELDS_KEY = 'frontpage-category-fields';

const FIELD_IDS = PICKABLE_FIELDS.map((field) => field.id);

const SAFE_ID = '^[a-z0-9-]+$';

export const CATEGORY_FIELDS_SCRIPT = `try{var c=JSON.parse(localStorage.getItem(${JSON.stringify(CATEGORY_FIELDS_KEY)})||"{}"),f=${JSON.stringify(FIELD_IDS)};for(var k in c)if(new RegExp(${JSON.stringify(SAFE_ID)}).test(k)&&f.indexOf(c[k])>-1)document.documentElement.style.setProperty("--category-"+k,"var(--color-field-"+c[k]+")")}catch(e){}`;

// Returns the CSS color for a category: the guest's choice when one is set on <html>, else `preset`.
export function categoryColor(id: string, preset: string): string {
    return `var(--category-${id}, ${preset})`;
}

// Sets every chosen color on <html>, for a change made in this tab or another one.
export function applyCategoryFields(choices: FieldChoices) {
    for (const [id, fieldId] of Object.entries(choices)) {
        if (new RegExp(SAFE_ID).test(id))
            document.documentElement.style.setProperty(`--category-${id}`, `var(--color-field-${fieldId})`);
    }
}
