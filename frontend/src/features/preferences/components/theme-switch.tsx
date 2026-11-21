'use client';

// Auto / light / dark theme switch. The choice lives on <html data-theme> and in localStorage when storage is available.

import { useEffect, useSyncExternalStore, type CSSProperties } from 'react';

type Theme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'frontpage-theme';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
    { value: 'system', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
];

const listeners = new Set<() => void>();

let memoryTheme: Theme = 'system';

// Renders the switch as a radio group of pills in the surrounding text color; `contrast` colors the checked pill's label.
export function ThemeSwitch({ contrast }: { contrast: string }) {
    const theme = useSyncExternalStore(subscribe, readTheme, () => 'system' as Theme);

    useEffect(() => {
        if (theme === 'system') {
            delete document.documentElement.dataset.theme;
        } else {
            document.documentElement.dataset.theme = theme;
        }
    }, [theme]);

    return (
        <fieldset className="flex items-center gap-1" style={{ '--switch-contrast': contrast } as CSSProperties}>
            <legend className="sr-only">Theme</legend>
            {THEME_OPTIONS.map((option) => (
                <label
                    key={option.value}
                    className="cursor-pointer rounded-lg px-3 py-1.5 text-meta font-semibold has-[:checked]:bg-current has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-current"
                >
                    <input
                        type="radio"
                        name="theme"
                        value={option.value}
                        checked={theme === option.value}
                        onChange={() => storeTheme(option.value)}
                        className="peer sr-only"
                    />
                    <span className="peer-checked:text-(--switch-contrast)">{option.label}</span>
                </label>
            ))}
        </fieldset>
    );
}

// Registers a listener for theme changes made through this switch; returns the unsubscribe function.
function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// Reads the saved theme; falls back to the in-memory choice when storage is blocked.
function readTheme(): Theme {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
        return memoryTheme;
    }
}

// Saves the theme in memory and, when allowed, in localStorage, then notifies the switch to re-render.
function storeTheme(theme: Theme) {
    memoryTheme = theme;
    try {
        if (theme === 'system') {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, theme);
        }
    } catch {
        // Storage can be unavailable in private windows; the in-memory choice still holds for this visit.
    }
    listeners.forEach((listener) => listener());
}
