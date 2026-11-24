// Every preference saved in localStorage and mirrored onto <html> as a data attribute (data-theme, data-text-size, …),
// written once here so the early script in the root layout and the hooks that change them can never drift apart.
// A preference stores only its non-default values; no attribute means the default, so the CSS needs no rule for it.

export type SavedPreference = {
    key: string;
    attribute: string;
    values: readonly string[];
};

export const SAVED_PREFERENCES = {
    theme: { key: 'frontpage-theme', attribute: 'theme', values: ['light', 'dark'] },
    contrast: { key: 'frontpage-contrast', attribute: 'contrast', values: ['standard', 'more'] },
    textSize: { key: 'frontpage-text-size', attribute: 'textSize', values: ['s', 'l', 'xl'] },
    leading: { key: 'frontpage-leading', attribute: 'leading', values: ['tight', 'loose'] },
    measure: { key: 'frontpage-measure', attribute: 'measure', values: ['narrow', 'wide'] },
    density: { key: 'frontpage-density', attribute: 'density', values: ['compact', 'spacious'] },
    readingFace: { key: 'frontpage-reading-face', attribute: 'readingFace', values: ['atkinson', 'lexend'] },
    sidebar: { key: 'frontpage-sidebar', attribute: 'sidebar', values: ['collapsed'] },
} as const satisfies Record<string, SavedPreference>;

export const SAVED_PREFERENCES_SCRIPT = savedPreferencesScript(Object.values(SAVED_PREFERENCES));

// Returns the inline script that copies each saved choice onto <html> before the first paint, ignoring unknown values
// and doing nothing when storage is blocked. Example output: try{var d=…;v=localStorage.getItem("frontpage-theme");…}
export function savedPreferencesScript(preferences: readonly SavedPreference[]): string {
    const copies = preferences
        .map(
            ({ key, attribute, values }) =>
                `v=localStorage.getItem(${JSON.stringify(key)});if(${JSON.stringify(values)}.indexOf(v)>-1)d.dataset.${attribute}=v;`,
        )
        .join('');
    return `try{var d=document.documentElement,v;${copies}}catch(e){}`;
}
