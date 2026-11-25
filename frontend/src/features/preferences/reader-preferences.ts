// Each reader setting's choices, in the order the settings panel shows them. "auto" is each setting's default; the CSS
// for the other values lives in styles/tokens.css.

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

export const DENSITY_OPTIONS = [
    { value: 'compact', label: 'Compact' },
    { value: 'auto', label: 'Comfortable' },
    { value: 'spacious', label: 'Spacious' },
] as const;
