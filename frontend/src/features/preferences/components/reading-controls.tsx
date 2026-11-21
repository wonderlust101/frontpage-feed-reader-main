'use client';

// Reading controls: a sticky bar for body size, line height, density and reading face. They set CSS custom properties
// (--text-body, --leading-body, --density, --reading-face) on a wrapper, so every reading surface inside inherits them.

import { useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';

type Density = 'compact' | 'comfortable' | 'spacious';

type ReadingFace = 'onest' | 'atkinson' | 'lexend';

const DENSITY_OPTIONS: { value: Density; label: string; scale: number }[] = [
    { value: 'compact', label: 'Compact', scale: 0.7 },
    { value: 'comfortable', label: 'Comfortable', scale: 1 },
    { value: 'spacious', label: 'Spacious', scale: 1.35 },
];

const FACE_OPTIONS: { value: ReadingFace; label: string; variable: string }[] = [
    { value: 'onest', label: 'Onest', variable: 'var(--font-onest)' },
    { value: 'atkinson', label: 'Atkinson Hyperlegible', variable: 'var(--font-atkinson)' },
    { value: 'lexend', label: 'Lexend', variable: 'var(--font-lexend)' },
];

// Wraps page content with the sticky controls bar and applies the chosen reading settings to everything inside.
export function ReadingControls({ children }: { children: ReactNode }) {
    const [size, setSize] = useState(19);
    const [leading, setLeading] = useState(1.6);
    const [density, setDensity] = useState<Density>('comfortable');
    const [face, setFace] = useState<ReadingFace>('onest');
    const [isOpen, setIsOpen] = useState(false);

    const densityOption = DENSITY_OPTIONS.find((option) => option.value === density) ?? DENSITY_OPTIONS[1];
    const faceOption = FACE_OPTIONS.find((option) => option.value === face) ?? FACE_OPTIONS[0];
    const readingStyle = {
        '--text-body': `${size / 16}rem`,
        '--leading-body': String(leading),
        '--density': String(densityOption.scale),
        '--reading-face': faceOption.variable,
    } as CSSProperties;

    return (
        <div style={readingStyle} className="flex flex-1 flex-col">
            <section aria-label="Reading controls" className="sticky top-0 z-20 border-b border-ink/15 bg-ground-2">
                <div className="mx-auto max-w-page px-gutter">
                    <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls="reading-controls-panel"
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex h-12 w-full items-center justify-between text-ui font-semibold md:hidden"
                    >
                        Reading controls
                        <span className="text-meta font-medium text-ink-2">
                            {size}px · {leading.toFixed(2)} · {densityOption.label}
                        </span>
                    </button>
                    <div
                        id="reading-controls-panel"
                        className={`${isOpen ? 'flex' : 'hidden'} flex-col gap-4 pb-4 md:flex md:flex-row md:flex-wrap md:items-center md:gap-x-10 md:py-3`}
                    >
                        <RangeControl id="text-size" label="Text size" min={16} max={24} step={1} value={size} display={`${size}px`} onChange={setSize} />
                        <RangeControl
                            id="line-height"
                            label="Line height"
                            min={1.35}
                            max={1.9}
                            step={0.05}
                            value={leading}
                            display={leading.toFixed(2)}
                            onChange={setLeading}
                        />
                        <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <legend className="float-left mr-3 text-meta font-semibold text-ink-2">Density</legend>
                            <span className="flex gap-1">
                                {DENSITY_OPTIONS.map((option) => (
                                    <label
                                        key={option.value}
                                        className="cursor-pointer rounded-lg border-[1.5px] border-ink px-3 py-1 text-meta font-semibold has-[:checked]:bg-ink has-[:checked]:text-ground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
                                    >
                                        <input
                                            type="radio"
                                            name="density"
                                            value={option.value}
                                            checked={density === option.value}
                                            onChange={() => setDensity(option.value)}
                                            className="sr-only"
                                        />
                                        {option.label}
                                    </label>
                                ))}
                            </span>
                        </fieldset>
                        <label className="flex items-center gap-3 text-meta font-semibold text-ink-2">
                            Reading face
                            <span className="relative inline-flex items-center">
                                <select
                                    value={face}
                                    onChange={(event) => setFace(event.target.value as ReadingFace)}
                                    className="h-8 appearance-none rounded-lg border-[1.5px] border-ink bg-ground pr-8 pl-3 text-meta font-semibold text-ink"
                                >
                                    {FACE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <Icon name="expand" size="inline" className="pointer-events-none absolute right-2.5" />
                            </span>
                        </label>
                    </div>
                </div>
            </section>
            {children}
        </div>
    );
}

type RangeControlProps = {
    id: string;
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
    display: string;
    onChange: (value: number) => void;
};

// Renders one labeled slider with its current value; used for text size and line height.
function RangeControl({ id, label, min, max, step, value, display, onChange }: RangeControlProps) {
    return (
        <div className="flex items-center gap-3">
            <label htmlFor={id} className="w-20 flex-none text-meta font-semibold text-ink-2 md:w-auto">
                {label}
            </label>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="range min-w-0 flex-1 md:w-36 md:flex-none"
            />
            <output htmlFor={id} className="w-12 text-meta font-semibold tabular-nums">
                {display}
            </output>
        </div>
    );
}
