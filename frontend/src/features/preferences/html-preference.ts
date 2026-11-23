'use client';

// A reader preference stored on <html> as a data attribute (data-theme, data-contrast) and in localStorage when storage
// is available. "Auto" removes the attribute, so the CSS falls back to the system setting.
// Theme and contrast are created here once: each call makes its own store, so every control for a setting must share
// one hook to stay in step. The storage keys are mirrored in the root layout's early script.

import { useEffect, useSyncExternalStore } from 'react';

export const useTheme = createHtmlPreference('frontpage-theme', 'theme', ['light', 'dark'] as const);

export const useContrast = createHtmlPreference('frontpage-contrast', 'contrast', ['standard', 'more'] as const);

export const THEME_OPTIONS = [
    { value: 'auto', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
] as const;

export const CONTRAST_OPTIONS = [
    { value: 'auto', label: 'Auto' },
    { value: 'standard', label: 'Standard' },
    { value: 'more', label: 'High' },
] as const;

// Returns the hook for one preference: `attribute` is the data-* name, `values` the stored (non-auto) choices.
export function createHtmlPreference<Value extends string>(storageKey: string, attribute: string, values: readonly Value[]) {
    type Choice = Value | 'auto';

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
