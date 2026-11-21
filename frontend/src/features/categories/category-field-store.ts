'use client';

// Category colors a guest has chosen, kept in localStorage so they survive reloads on this device (signed-in readers
// will keep theirs on the server). Changes reach every component using the hook, and other open tabs.

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { assignFields, categoryFieldById, type Field, type FieldChoices, type FieldId } from './fields';

const STORAGE_KEY = 'frontpage-category-fields';

const NO_CHOICES: FieldChoices = {};

const listeners = new Set<() => void>();

let memoryRaw: string | null = null;

let cached: { raw: string | null; choices: FieldChoices } = { raw: null, choices: NO_CHOICES };

// The field of every category in `categoryIds` and a setter. `presets` are fields categories start with before the
// reader chooses (sample data); without one a category has "No color".
export function useCategoryFields(categoryIds: string[], presets?: FieldChoices): [Record<string, Field>, (id: string, fieldId: FieldId) => void] {
    const choices = useSyncExternalStore(subscribe, readChoices, () => NO_CHOICES);
    const idsKey = categoryIds.join('\n');
    const fields = useMemo(() => assignFields(idsKey.split('\n'), choices, presets), [idsKey, choices, presets]);
    const choose = useCallback((id: string, fieldId: FieldId) => storeChoice(id, fieldId), []);

    return [fields, choose];
}

// Registers a listener for changes from this tab and, through the storage event, from other tabs.
function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY) {
            listener();
        }
    };
    window.addEventListener('storage', onStorage);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
    };
}

// Reads the saved JSON (or the in-memory copy when storage is blocked); returns the same object until it changes.
function readChoices(): FieldChoices {
    let raw = memoryRaw;
    try {
        raw = localStorage.getItem(STORAGE_KEY);
    } catch {
        // Storage can be unavailable in private windows; fall back to this visit's choices.
    }
    if (raw !== cached.raw) {
        cached = { raw, choices: parseChoices(raw) };
    }
    return cached.choices;
}

// Keeps only entries that name a field a category may take; anything else in storage is ignored.
function parseChoices(raw: string | null): FieldChoices {
    try {
        const parsed: unknown = raw ? JSON.parse(raw) : {};
        if (!parsed || typeof parsed !== 'object') {
            return NO_CHOICES;
        }
        return Object.fromEntries(
            Object.entries(parsed).filter((entry): entry is [string, FieldId] => typeof entry[1] === 'string' && categoryFieldById(entry[1]) !== undefined),
        );
    } catch {
        return NO_CHOICES;
    }
}

// Saves one category's choice in memory and, when allowed, in localStorage, then re-renders every user of the hook.
function storeChoice(id: string, fieldId: FieldId) {
    memoryRaw = JSON.stringify({ ...readChoices(), [id]: fieldId });
    try {
        localStorage.setItem(STORAGE_KEY, memoryRaw);
    } catch {
        // The in-memory copy still holds for this visit.
    }
    listeners.forEach((listener) => listener());
}
