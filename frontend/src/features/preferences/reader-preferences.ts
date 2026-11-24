'use client';

// The reader settings as shared hooks, one store each. "auto" is each setting's default; the CSS for the other
// values lives in styles/tokens.css.

import { createHtmlPreference } from '@/lib/html-preference';
import { SAVED_PREFERENCES } from '@/lib/saved-preferences';

export const useTheme = createHtmlPreference(SAVED_PREFERENCES.theme);

export const useContrast = createHtmlPreference(SAVED_PREFERENCES.contrast);

export const useTextSize = createHtmlPreference(SAVED_PREFERENCES.textSize);

export const useLeading = createHtmlPreference(SAVED_PREFERENCES.leading);

export const useMeasure = createHtmlPreference(SAVED_PREFERENCES.measure);

export const useDensity = createHtmlPreference(SAVED_PREFERENCES.density);

export const useReadingFace = createHtmlPreference(SAVED_PREFERENCES.readingFace);

export const TEXT_SIZE_STEPS = [
    { value: 's', label: '17px' },
    { value: 'auto', label: '19px' },
    { value: 'l', label: '21px' },
    { value: 'xl', label: '23px' },
] as const;

export const LEADING_OPTIONS = [
    { value: 'tight', label: 'Tight' },
    { value: 'auto', label: 'Normal' },
    { value: 'loose', label: 'Loose' },
] as const;

export const MEASURE_OPTIONS = [
    { value: 'narrow', label: 'Narrow' },
    { value: 'auto', label: 'Standard' },
    { value: 'wide', label: 'Wide' },
] as const;

export const DENSITY_OPTIONS = [
    { value: 'compact', label: 'Compact' },
    { value: 'auto', label: 'Comfortable' },
    { value: 'spacious', label: 'Spacious' },
] as const;

export const READING_FACE_OPTIONS = [
    { value: 'auto', label: 'Onest' },
    { value: 'atkinson', label: 'Atkinson' },
    { value: 'lexend', label: 'Lexend' },
] as const;

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
