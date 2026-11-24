'use client';

// A saved preference (lib/saved-preferences.ts) as a React hook: the choice lives on <html> as a data attribute and in
// localStorage when storage is available. "auto" is the default and removes the attribute. Each call makes its own
// store, so create one hook per preference and share it: two hooks for one setting would not update each other.

import { useEffect, useSyncExternalStore } from 'react';
import type { SavedPreference } from './saved-preferences';

// Returns the hook for `preference`; its choice is one of the preference's values or "auto".
export function createHtmlPreference<const Preference extends SavedPreference>({ key: storageKey, attribute, values }: Preference) {
    type Choice = Preference['values'][number] | 'auto';

    const listeners = new Set<() => void>();
    let memoryChoice: Choice = 'auto';

    // Registers a listener for changes made through any switch for this preference; returns the unsubscribe function.
    function subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }

    // Reads the saved choice; falls back to the in-memory choice when storage is blocked.
    function read(): Choice {
        try {
            const stored = localStorage.getItem(storageKey);
            return values.find((value) => value === stored) ?? 'auto';
        } catch {
            return memoryChoice;
        }
    }

    // Saves the choice in memory and, when allowed, in localStorage, then notifies every switch to re-render.
    function store(choice: Choice) {
        memoryChoice = choice;
        try {
            if (choice === 'auto') {
                localStorage.removeItem(storageKey);
            } else {
                localStorage.setItem(storageKey, choice);
            }
        } catch {
            // Storage can be unavailable in private windows; the in-memory choice still holds for this visit.
        }
        listeners.forEach((listener) => listener());
    }

    // The current choice and its setter; mirrors the choice onto <html data-*>.
    return function usePreference(): [Choice, (choice: Choice) => void] {
        const choice = useSyncExternalStore(subscribe, read, () => 'auto' as Choice);

        useEffect(() => {
            if (choice === 'auto') {
                delete document.documentElement.dataset[attribute];
            } else {
                document.documentElement.dataset[attribute] = choice;
            }
        }, [choice]);

        return [choice, store];
    };
}
