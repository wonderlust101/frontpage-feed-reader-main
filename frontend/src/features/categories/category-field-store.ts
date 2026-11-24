// Category colours a guest has chosen, kept in localStorage. Changes reach every user of the hook and other open tabs,
// and set the CSS properties on <html> that the shell paints from.

import 'client-only';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { applyCategoryFields, CATEGORY_FIELDS_KEY as STORAGE_KEY } from './category-field-vars';
import { assignFields, categoryFieldById, type Field, type FieldChoices, type FieldId } from './fields';

const NO_CHOICES: FieldChoices = {};

const listeners = new Set<() => void>();

let memoryRaw: string | null = null;

let cached: { raw: string | null; choices: FieldChoices } = { raw: null, choices: NO_CHOICES };

// `presets` are fields categories start with before the reader chooses; without one a category has "No color".
export function useCategoryFields(categoryIds: string[], presets?: FieldChoices): [Record<string, Field>, (id: string, fieldId: FieldId) => void] {
    const choices = useSyncExternalStore(subscribe, readChoices, () => NO_CHOICES);
    const idsKey = categoryIds.join('\n');
    const fields = useMemo(() => assignFields(idsKey.split('\n'), choices, presets), [idsKey, choices, presets]);
    const choose = useCallback((id: string, fieldId: FieldId) => storeChoice(id, fieldId), []);

    return [fields, choose];
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY) {
            applyCategoryFields(readChoices());
            listener();
        }
    };

    window.addEventListener('storage', onStorage);

    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
    };
}

// Returns the same object until it changes, as useSyncExternalStore requires.
function readChoices(): FieldChoices {
    let raw = memoryRaw;

    try {
        raw = localStorage.getItem(STORAGE_KEY);
    } catch {
    }

    if (raw !== cached.raw)
        cached = { raw, choices: parseChoices(raw) };

    return cached.choices;
}

function parseChoices(raw: string | null): FieldChoices {
    try {
        const parsed: unknown = raw ? JSON.parse(raw) : {};

        if (!parsed || typeof parsed !== 'object')
            return NO_CHOICES;

        return Object.fromEntries(
            Object.entries(parsed).filter((entry): entry is [string, FieldId] => typeof entry[1] === 'string' && categoryFieldById(entry[1]) !== undefined),
        );
    } catch {
        return NO_CHOICES;
    }
}

function storeChoice(id: string, fieldId: FieldId) {
    memoryRaw = JSON.stringify({ ...readChoices(), [id]: fieldId });

    try {
        localStorage.setItem(STORAGE_KEY, memoryRaw);
    } catch {
        // Storage can be unavailable in private windows; the in-memory copy still holds for this visit.
    }

    applyCategoryFields({ [id]: fieldId });
    listeners.forEach((listener) => listener());
}
