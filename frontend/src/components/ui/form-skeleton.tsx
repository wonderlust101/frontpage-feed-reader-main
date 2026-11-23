// What a form shows while it can't render yet (its page is reading the URL on the server, or it is waiting for the
// session in the browser): rule-soft bars in the form's shape, so nothing jumps when the real fields arrive.

type FormSkeletonProps = {
    fields: number;
};

// Renders `fields` label-and-input bars and a button bar, hidden from screen readers.
export function FormSkeleton({ fields }: FormSkeletonProps) {
    return (
        <div aria-hidden="true" className="flex flex-col gap-6">
            {Array.from({ length: fields }, (_, index) => (
                <div key={index} className="flex flex-col gap-2">
                    <span className="h-5 w-24 rounded-tag bg-rule-soft" />
                    <span className="h-12 rounded-control bg-rule-soft" />
                </div>
            ))}
            <span className="h-11 rounded-control bg-rule-soft" />
        </div>
    );
}
