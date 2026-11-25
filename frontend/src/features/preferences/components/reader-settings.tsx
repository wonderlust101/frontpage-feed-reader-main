'use client';

// Every change applies at once and is saved, and a sample line at the top reflows, so a setting is seen before it's read.

import { useId } from 'react';
import { ShellMenu } from '@/components/app-shell/shell-menu';
import { Icon, type IconName } from '@/components/ui/icon';
import { useContrast, useDensity, useLeading, useMeasure, useReadingFace, useTextSize, useTheme } from '../hooks/use-reader-preferences';
import {
    CONTRAST_OPTIONS,
    DENSITY_OPTIONS,
    LEADING_OPTIONS,
    MEASURE_OPTIONS,
    READING_FACE_OPTIONS,
    TEXT_SIZE_STEPS,
    THEME_OPTIONS,
} from '../reader-preferences';
import { ChoiceControl } from './choice-control';

type SizeStepButtonProps = {
    icon: IconName;
    label: string;
    disabled: boolean;
    onClick: () => void;
};

// Radio names come from useId, so two copies on one page never share a group.
export function ReaderSettings() {
    const id = useId();
    const [textSize, setTextSize] = useTextSize();
    const [leading, setLeading] = useLeading();
    const [measure, setMeasure] = useMeasure();
    const [readingFace, setReadingFace] = useReadingFace();
    const [theme, setTheme] = useTheme();
    const [contrast, setContrast] = useContrast();
    const [density, setDensity] = useDensity();
    const sizeIndex = TEXT_SIZE_STEPS.findIndex((step) => step.value === textSize);

    function resetToDefaults() {
        [setTextSize, setLeading, setMeasure, setReadingFace, setTheme, setContrast, setDensity].forEach((reset) => reset('auto'));
    }

    return (
        <ShellMenu
            label="Reader settings"
            placement="below"
            triggerClassName="tool-button font-display text-ui font-bold tracking-[-0.01em]"
            trigger={
                <>
                    <span aria-hidden="true">Aa</span>
                    <span className="sr-only">Reader settings</span>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                <h2 className="font-display text-title leading-none font-bold tracking-[-0.02em]">Reading</h2>
                <p className="rounded-panel bg-ground-2 px-4 py-3 type-body transition-[font-size,line-height] duration-200 ease-out">
                    Your front page, set the way you like to read.
                </p>
                <div role="group" aria-labelledby={`${id}-size`} className="flex items-center justify-between gap-3">
                    <span id={`${id}-size`} className="text-meta font-semibold text-ink-2">
                        Text size
                    </span>
                    <span className="flex items-center gap-2">
                        <SizeStepButton
                            icon="text-smaller"
                            label="Smaller text"
                            disabled={sizeIndex === 0}
                            onClick={() => setTextSize(TEXT_SIZE_STEPS[sizeIndex - 1].value)}
                        />
                        <output aria-live="polite" className="w-12 text-center text-ui font-semibold">
                            {TEXT_SIZE_STEPS[sizeIndex].label}
                        </output>
                        <SizeStepButton
                            icon="text-larger"
                            label="Larger text"
                            disabled={sizeIndex === TEXT_SIZE_STEPS.length - 1}
                            onClick={() => setTextSize(TEXT_SIZE_STEPS[sizeIndex + 1].value)}
                        />
                    </span>
                </div>
                <ChoiceControl name={`${id}-leading`} legend="Line height" options={LEADING_OPTIONS} value={leading} onChange={setLeading} />
                <ChoiceControl name={`${id}-measure`} legend="Reading width" options={MEASURE_OPTIONS} value={measure} onChange={setMeasure} />
                <ChoiceControl name={`${id}-face`} legend="Typeface" options={READING_FACE_OPTIONS} value={readingFace} onChange={setReadingFace} />
                <details className="group border-t border-edge pt-3">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-display text-title leading-none font-bold tracking-[-0.02em] [&::-webkit-details-marker]:hidden">
                        Display
                        <Icon name="expand" className="text-ink-2 transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <div className="mt-3 flex flex-col gap-4">
                        <ChoiceControl name={`${id}-theme`} legend="Theme" options={THEME_OPTIONS} value={theme} onChange={setTheme} />
                        <ChoiceControl name={`${id}-contrast`} legend="Contrast" options={CONTRAST_OPTIONS} value={contrast} onChange={setContrast} />
                        <ChoiceControl name={`${id}-density`} legend="Density" options={DENSITY_OPTIONS} value={density} onChange={setDensity} />
                    </div>
                </details>
                <button
                    type="button"
                    onClick={resetToDefaults}
                    className="self-start text-meta font-semibold underline decoration-1 underline-offset-4 hover:decoration-2"
                >
                    Reset to defaults
                </button>
            </div>
        </ShellMenu>
    );
}

function SizeStepButton({ icon, label, disabled, onClick }: SizeStepButtonProps) {
    return (
        <button type="button" disabled={disabled} onClick={onClick} className="tool-button disabled:cursor-not-allowed disabled:opacity-40">
            <Icon name={icon} />
            <span className="sr-only">{label}</span>
        </button>
    );
}
