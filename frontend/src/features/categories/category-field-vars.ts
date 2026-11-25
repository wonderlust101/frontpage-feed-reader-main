// A guest's category colors as CSS custom properties on <html>, so the shell paints a chosen color on the first frame:
// the root layout's early script copies the saved choices before first paint.

import { PICKABLE_FIELDS, type FieldChoices } from './fields';

export const CATEGORY_FIELDS_KEY = 'frontpage-category-fields';

const FIELD_IDS = PICKABLE_FIELDS.map((field) => field.id);

const SAFE_ID = '^[a-z0-9-]+$';

const SAFE_ID_PATTERN = new RegExp(SAFE_ID);

export const CATEGORY_FIELDS_SCRIPT = `try{var c=JSON.parse(localStorage.getItem(${JSON.stringify(CATEGORY_FIELDS_KEY)})||"{}"),f=${JSON.stringify(FIELD_IDS)};for(var k in c)if(new RegExp(${JSON.stringify(SAFE_ID)}).test(k)&&f.indexOf(c[k])>-1)document.documentElement.style.setProperty("--category-"+k,"var(--color-field-"+c[k]+")")}catch(e){}`;

export function categoryColor(id: string, preset: string): string {
    return `var(--category-${id}, ${preset})`;
}

export function applyCategoryFields(choices: FieldChoices) {
    for (const [id, fieldId] of Object.entries(choices)) {
        if (SAFE_ID_PATTERN.test(id))
            document.documentElement.style.setProperty(`--category-${id}`, `var(--color-field-${fieldId})`);
    }
}
