// A saved preference as a hook. Each call makes its own store, so create one hook per preference and share it: two
// hooks for one setting would not update each other.

import 'client-only';
import { useEffect, useSyncExternalStore } from 'react';
import type { SavedPreference } from './saved-preferences';

export function createHtmlPreference<const Preference extends SavedPreference>({ key: storageKey, attribute, values }: Preference) {
    type Choice = Preference['values'][number] | 'auto';

    const listeners = new Set<() => void>();
    let memoryChoice: Choice = 'auto';

    function subscribe(listener: () => void) {
        listeners.add(listener);

        return () => listeners.delete(listener);
    }

    function read(): Choice {
        try {
            const stored = localStorage.getItem(storageKey);

            return values.find((value) => value === stored) ?? 'auto';
        } catch {
            return memoryChoice;
        }
    }

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

    return function usePreference(): [Choice, (choice: Choice) => void] {
        const choice = useSyncExternalStore<Choice>(subscribe, read, () => 'auto');

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
