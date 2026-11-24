// A reader's library as a category's quick actions edit it: their categories in order, each with a field and its feeds,
// and the feeds in no category ("Uncategorized", as in the database: a subscription whose category is null). Every
// edit returns a new library. Names are unique ignoring case, as the categories table enforces. Until the categories
// and subscriptions endpoints exist, only /design-system runs these, on sample data.

import type { FieldId } from './fields';

export type LibraryCategory = {
    id: string;
    name: string;
    fieldId: FieldId;
    feeds: string[];
};

export type Library = {
    categories: LibraryCategory[];
    uncategorized: string[];
};

// Whether another category already has `name`, ignoring case and outer spaces; `exceptId` skips the one being renamed.
export function isNameTaken(library: Library, name: string, exceptId?: string): boolean {
    const wanted = name.trim().toLowerCase();
    return library.categories.some((category) => category.id !== exceptId && category.name.toLowerCase() === wanted);
}

// Changes one category's name or field.
export function updateCategory(library: Library, id: string, changes: Partial<Pick<LibraryCategory, 'name' | 'fieldId'>>): Library {
    return { ...library, categories: library.categories.map((category) => (category.id === id ? { ...category, ...changes } : category)) };
}

// Removes a category; its feeds move to Uncategorized, as deleting a category does in the database.
export function deleteCategory(library: Library, id: string): Library {
    const removed = library.categories.find((category) => category.id === id);
    return {
        categories: library.categories.filter((category) => category.id !== id),
        uncategorized: [...library.uncategorized, ...(removed?.feeds ?? [])],
    };
}
