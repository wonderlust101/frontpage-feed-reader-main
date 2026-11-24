// A labeled set of radio pills, one choice at a time, the legend above and the pills sharing the row equally: the
// reader settings in the Aa menu, and the design system's specimen switches. `name` groups the radios, so two controls
// for one setting need different names.

type ChoiceControlProps<Value extends string> = {
    name: string;
    legend: string;
    options: readonly { value: Value; label: string }[];
    value: Value;
    onChange: (value: Value) => void;
};

// Renders the legend and the pills; `onChange` gets the picked option's value.
export function ChoiceControl<Value extends string>({ name, legend, options, value, onChange }: ChoiceControlProps<Value>) {
    return (
        <fieldset>
            <legend className="mb-1.5 text-meta font-semibold text-ink-2">{legend}</legend>
            <span className="grid auto-cols-fr grid-flow-col gap-1">
                {options.map((option) => (
                    <label
                        key={option.value}
                        className="relative cursor-pointer rounded-toggle border-[1.5px] border-control-edge px-2 py-1.5 text-center text-meta font-semibold transition-colors duration-150 hover:border-ink has-[:checked]:border-ink after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] has-[:checked]:bg-ink has-[:checked]:text-ground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
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
