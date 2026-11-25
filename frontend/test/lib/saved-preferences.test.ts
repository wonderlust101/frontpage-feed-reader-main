import { afterEach, describe, expect, test } from 'bun:test';
import { SAVED_PREFERENCES, savedPreferencesScript } from '../../src/lib/saved-preferences';

const realLocalStorage = globalThis.localStorage;

// Runs `script` against a fake <html> and `storage`; returns the data attributes it set.
function runScript(script: string, storage: Pick<Storage, 'getItem'>): Record<string, string> {
    const dataset: Record<string, string> = {};

    globalThis.localStorage = storage as Storage;
    new Function('document', script)({ documentElement: { dataset } });

    return dataset;
}

function storageHolding(stored: Record<string, string>): Pick<Storage, 'getItem'> {
    return { getItem: (key) => stored[key] ?? null };
}

afterEach(() => {
    globalThis.localStorage = realLocalStorage;
});

describe('savedPreferencesScript', () => {
    test('copies every known saved value onto <html>', () => {
        const storage = storageHolding({
            'frontpage-theme': 'dark',
            'frontpage-text-size': 'xl',
            'frontpage-reading-face': 'lexend',
            'frontpage-sidebar': 'collapsed',
        });
        const dataset = runScript(savedPreferencesScript(Object.values(SAVED_PREFERENCES)), storage);

        expect(dataset).toEqual({ theme: 'dark', textSize: 'xl', readingFace: 'lexend', sidebar: 'collapsed' });
    });

    test('ignores values the preference does not allow', () => {
        const dataset = runScript(savedPreferencesScript([SAVED_PREFERENCES.theme]), storageHolding({ 'frontpage-theme': 'purple' }));

        expect(dataset).toEqual({});
    });

    test('does nothing when storage is blocked', () => {
        const blocked: Pick<Storage, 'getItem'> = {
            getItem: () => {
                throw new Error('blocked');
            },
        };

        // runScript would throw (and fail the test) if the script let the error out.
        const dataset = runScript(savedPreferencesScript([SAVED_PREFERENCES.theme]), blocked);

        expect(dataset).toEqual({});
    });
});
