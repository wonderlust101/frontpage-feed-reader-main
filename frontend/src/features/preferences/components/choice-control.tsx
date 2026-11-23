// A labeled row of radio pills, one choice at a time: the reading controls (density, line length, contrast) and the
// header's appearance menu. `name` groups the radios, so two controls for one setting need different names.

type ChoiceControlProps<Value extends string> = {
    name: string;
    legend: string;
    options: readonly { value: Value; label: string }[];
    value: Value;
    onChange: (value: Value) => void;
};

// Renders a labeled row of radio pills; `onChange` gets the picked option's value.
export function ChoiceControl<Value extends string>({ name, legend, options, value, onChange }: ChoiceControlProps<Value>) {
    return (
        <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <legend className="float-left mr-3 w-20 text-meta font-semibold text-ink-2 md:w-auto">{legend}</legend>
            <span className="flex gap-1">
                {options.map((option) => (
                    <label
                        key={option.value}
                        className="relative cursor-pointer rounded-toggle border-[1.5px] border-control-edge px-3 py-1 text-meta font-semibold has-[:checked]:border-ink after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] has-[:checked]:bg-ink has-[:checked]:text-ground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
                    >
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            checked={value === option.value}
                            onChange={() => onChange(option.value)}
                            className="sr-only"
                        />
                        {option.label}
                    </label>
                ))}
            </span>
        </fieldset>
    );
}
