// A reader's library as the manage tools edit it: their categories in order, each with a field and its feeds, and the
// feeds in no category ("Uncategorized", as in the database: a subscription whose category is null). Every edit returns
// a new library. Names are unique ignoring case, as the categories table enforces. Until the categories and
// subscriptions endpoints exist, only /design-system runs these, on sample data.

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

// Adds an empty category at the end, on "No color", the way a new category starts.
export function addCategory(library: Library, id: string, name: string): Library {
    return { ...library, categories: [...library.categories, { id, name: name.trim(), fieldId: 'none', feeds: [] }] };
}

// Removes a category; its feeds move to Uncategorized, as deleting a category does in the database.
export function deleteCategory(library: Library, id: string): Library {
    const removed = library.categories.find((category) => category.id === id);
    return {
        categories: library.categories.filter((category) => category.id !== id),
        uncategorized: [...library.uncategorized, ...(removed?.feeds ?? [])],
    };
}

// Moves a category one place up (-1) or down (1); at either end it stays put.
export function moveCategory(library: Library, id: string, offset: -1 | 1): Library {
    const from = library.categories.findIndex((category) => category.id === id);
    const to = from + offset;
    if (from === -1 || to < 0 || to >= library.categories.length) {
        return library;
    }
    const categories = [...library.categories];
    [categories[from], categories[to]] = [categories[to], categories[from]];
    return { ...library, categories };
}

// Adds a feed to a category, or to Uncategorized when `categoryId` is null, first taking it out of wherever it was.
export function placeFeed(library: Library, feed: string, categoryId: string | null): Library {
    const without = unsubscribe(library, feed);
    if (categoryId === null) {
        return { ...without, uncategorized: [...without.uncategorized, feed] };
    }
    return {
        ...without,
        categories: without.categories.map((category) => (category.id === categoryId ? { ...category, feeds: [...category.feeds, feed] } : category)),
    };
}

// Removes a feed from the library, wherever it is.
export function unsubscribe(library: Library, feed: string): Library {
    return {
        categories: library.categories.map((category) => ({ ...category, feeds: category.feeds.filter((candidate) => candidate !== feed) })),
        uncategorized: library.uncategorized.filter((candidate) => candidate !== feed),
    };
}
