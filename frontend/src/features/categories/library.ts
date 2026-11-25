// A reader's library as a category's quick actions edit it. Every edit returns a new library. Names are unique
// ignoring case, as the categories table enforces.

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

// `exceptId` skips the category being renamed.
export function isNameTaken(library: Library, name: string, exceptId?: string): boolean {
    const wanted = name.trim().toLowerCase();

    return library.categories.some((category) => category.id !== exceptId && category.name.toLowerCase() === wanted);
}

export function updateCategory(library: Library, id: string, changes: Partial<Pick<LibraryCategory, 'name' | 'fieldId'>>): Library {
    return { ...library, categories: library.categories.map((category) => (category.id === id ? { ...category, ...changes } : category)) };
}

// Its feeds move to Uncategorized, as deleting a category does in the database.
export function deleteCategory(library: Library, id: string): Library {
    const removed = library.categories.find((category) => category.id === id);

    return {
        categories: library.categories.filter((category) => category.id !== id),
        uncategorized: [...library.uncategorized, ...(removed?.feeds ?? [])],
    };
}
