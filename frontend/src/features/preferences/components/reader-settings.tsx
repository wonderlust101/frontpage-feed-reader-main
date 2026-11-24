'use client';

// The reader's settings behind the Aa button: text size, line height, reading width, density, typeface, theme and
// contrast, in one light popover. Each change applies at once to every reading surface and is saved (see
// reader-preferences.ts), and a sample line at the top reflows as you go, so a setting is seen before it's read.

import { useId } from 'react';
import { ShellMenu } from '@/components/app-shell/shell-menu';
import { Icon } from '@/components/ui/icon';
import {
    CONTRAST_OPTIONS,
    DENSITY_OPTIONS,
    LEADING_OPTIONS,
    MEASURE_OPTIONS,
    READING_FACE_OPTIONS,
    TEXT_SIZE_STEPS,
    THEME_OPTIONS,
    useContrast,
    useDensity,
    useLeading,
    useMeasure,
    useReadingFace,
    useTextSize,
    useTheme,
} from '../reader-preferences';
import { ChoiceControl } from './choice-control';

// Renders the Aa button and its panel. Radio names come from useId, so two copies on one page never share a group.
export function ReaderSettings() {
    const id = useId();
    const [textSize, setTextSize] = useTextSize();
    const [leading, setLeading] = useLeading();
    const [measure, setMeasure] = useMeasure();
    const [density, setDensity] = useDensity();
    const [readingFace, setReadingFace] = useReadingFace();
    const [theme, setTheme] = useTheme();
    const [contrast, setContrast] = useContrast();
    const sizeIndex = TEXT_SIZE_STEPS.findIndex((step) => step.value === textSize);

    return (
        <ShellMenu
            label="Reader settings"
            placement="below"
            triggerClassName="tool-button font-display text-[1.0625rem] font-bold tracking-[-0.01em]"
            trigger={
                <>
                    <span aria-hidden="true">Aa</span>
                    <span className="sr-only">Reader settings</span>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                <p className="rounded-panel bg-ground-2 px-4 py-3 type-body transition-[font-size,line-height] duration-200 ease-out">
                    Your front page, set the way you like to read.
                </p>
                <div role="group" aria-labelledby={`${id}-size`} className="flex items-center justify-between gap-3">
                    <span id={`${id}-size`} className="text-meta font-semibold text-ink-2">
                        Text size
                    </span>
                    <span className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={sizeIndex === 0}
                            onClick={() => setTextSize(TEXT_SIZE_STEPS[sizeIndex - 1].value)}
                            className="tool-button disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Icon name="text-smaller" />
                            <span className="sr-only">Smaller text</span>
                        </button>
                        <output aria-live="polite" className="w-12 text-center text-ui font-semibold tabular-nums">
                            {TEXT_SIZE_STEPS[sizeIndex].label}
                        </output>
                        <button
                            type="button"
                            disabled={sizeIndex === TEXT_SIZE_STEPS.length - 1}
                            onClick={() => setTextSize(TEXT_SIZE_STEPS[sizeIndex + 1].value)}
                            className="tool-button disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Icon name="text-larger" />
                            <span className="sr-only">Larger text</span>
                        </button>
                    </span>
                </div>
                <ChoiceControl name={`${id}-leading`} legend="Line height" options={LEADING_OPTIONS} value={leading} onChange={setLeading} />
                <ChoiceControl name={`${id}-measure`} legend="Reading width" options={MEASURE_OPTIONS} value={measure} onChange={setMeasure} />
                <ChoiceControl name={`${id}-density`} legend="Density" options={DENSITY_OPTIONS} value={density} onChange={setDensity} />
                <ChoiceControl name={`${id}-face`} legend="Typeface" options={READING_FACE_OPTIONS} value={readingFace} onChange={setReadingFace} />
                <div className="flex flex-col gap-4 border-t border-edge pt-4">
                    <ChoiceControl name={`${id}-theme`} legend="Theme" options={THEME_OPTIONS} value={theme} onChange={setTheme} />
                    <ChoiceControl name={`${id}-contrast`} legend="Contrast" options={CONTRAST_OPTIONS} value={contrast} onChange={setContrast} />
                </div>
            </div>
        </ShellMenu>
    );
}
