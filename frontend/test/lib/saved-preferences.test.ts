import { afterEach, describe, expect, test } from 'bun:test';
import { SAVED_PREFERENCES, savedPreferencesScript } from '../../src/lib/saved-preferences';

const realLocalStorage = globalThis.localStorage;

// Runs `script` against a fake <html> and storage holding `stored`; returns the data attributes it set.
function runScript(script: string, stored: Record<string, string>): Record<string, string> {
    const dataset: Record<string, string> = {};
    globalThis.localStorage = { getItem: (key: string) => stored[key] ?? null } as Storage;
    new Function('document', script)({ documentElement: { dataset } });
    return dataset;
}

afterEach(() => {
    globalThis.localStorage = realLocalStorage;
});

describe('savedPreferencesScript', () => {
    test('copies every known saved value onto <html>', () => {
        const dataset = runScript(savedPreferencesScript(Object.values(SAVED_PREFERENCES)), {
            'frontpage-theme': 'dark',
            'frontpage-text-size': 'xl',
            'frontpage-reading-face': 'lexend',
            'frontpage-sidebar': 'collapsed',
        });

        expect(dataset).toEqual({ theme: 'dark', textSize: 'xl', readingFace: 'lexend', sidebar: 'collapsed' });
    });

    test('ignores values the preference does not allow', () => {
        const dataset = runScript(savedPreferencesScript([SAVED_PREFERENCES.theme]), { 'frontpage-theme': 'purple' });

        expect(dataset).toEqual({});
    });

    test('does nothing when storage is blocked', () => {
        globalThis.localStorage = {
            getItem: () => {
                throw new Error('blocked');
            },
        } as unknown as Storage;
        const dataset: Record<string, string> = {};

        expect(() => new Function('document', savedPreferencesScript([SAVED_PREFERENCES.theme]))({ documentElement: { dataset } })).not.toThrow();
        expect(dataset).toEqual({});
    });
});
