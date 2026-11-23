'use client';

// The header's appearance menu (the Aa button): theme and contrast, the two reader settings that apply to the whole
// site. Its radios have their own names, so they never join the reading controls' groups on the same page.

import { ShellMenu } from '@/components/app-shell/shell-menu';
import { CONTRAST_OPTIONS, THEME_OPTIONS, useContrast, useTheme } from '../html-preference';
import { ChoiceControl } from './choice-control';

// Renders the Aa button and its panel; choices apply at once and are saved like every other theme and contrast control.
export function AppearanceMenu() {
    const [theme, setTheme] = useTheme();
    const [contrast, setContrast] = useContrast();

    return (
        <ShellMenu id="appearance-menu" label="Appearance" icon="text-size">
            <div className="flex flex-col gap-4">
                <ChoiceControl name="appearance-theme" legend="Theme" options={THEME_OPTIONS} value={theme} onChange={setTheme} />
                <ChoiceControl name="appearance-contrast" legend="Contrast" options={CONTRAST_OPTIONS} value={contrast} onChange={setContrast} />
            </div>
        </ShellMenu>
    );
}
