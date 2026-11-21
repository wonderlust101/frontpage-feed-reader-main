'use client';

// Auto / light / dark theme switch. The choice lives on <html data-theme> and in localStorage when storage is available.

import type { CSSProperties } from 'react';
import { createHtmlPreference } from '../html-preference';

const useTheme = createHtmlPreference('frontpage-theme', 'theme', ['light', 'dark'] as const);

const THEME_OPTIONS = [
    { value: 'auto', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
] as const;

// Renders the switch as a radio group of pills in the surrounding text color; `contrast` colors the checked pill's label.
export function ThemeSwitch({ contrast }: { contrast: string }) {
    const [theme, setTheme] = useTheme();

    return (
        <fieldset className="flex items-center gap-1" style={{ '--switch-contrast': contrast } as CSSProperties}>
            <legend className="sr-only">Theme</legend>
            {THEME_OPTIONS.map((option) => (
                <label
                    key={option.value}
                    className="relative cursor-pointer rounded-toggle px-3 py-1.5 text-meta font-semibold after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] has-[:checked]:bg-current has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-current"
                >
                    <input
                        type="radio"
                        name="theme"
                        value={option.value}
                        checked={theme === option.value}
                        onChange={() => setTheme(option.value)}
                        className="peer sr-only"
                    />
                    <span className="peer-checked:text-(--switch-contrast)">{option.label}</span>
                </label>
            ))}
        </fieldset>
    );
}
