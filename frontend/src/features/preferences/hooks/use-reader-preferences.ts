// The reader settings as shared hooks, one store each, in the order the settings panel shows them.

import 'client-only';
import { createHtmlPreference } from '@/lib/html-preference';
import { SAVED_PREFERENCES } from '@/lib/saved-preferences';

export const useTextSize = createHtmlPreference(SAVED_PREFERENCES.textSize);

export const useLeading = createHtmlPreference(SAVED_PREFERENCES.leading);

export const useMeasure = createHtmlPreference(SAVED_PREFERENCES.measure);

export const useReadingFace = createHtmlPreference(SAVED_PREFERENCES.readingFace);

export const useTheme = createHtmlPreference(SAVED_PREFERENCES.theme);

export const useContrast = createHtmlPreference(SAVED_PREFERENCES.contrast);

export const useDensity = createHtmlPreference(SAVED_PREFERENCES.density);
