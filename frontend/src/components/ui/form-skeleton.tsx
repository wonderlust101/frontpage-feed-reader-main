// Skeleton bars in the form's shape while the form can't render yet, so nothing jumps when the fields arrive.

type FormSkeletonProps = {
    fields: number;
};

export function FormSkeleton({ fields }: FormSkeletonProps) {
    return (
        <div aria-hidden="true" className="flex flex-col gap-6">
            {Array.from({ length: fields }, (_, index) => (
                <div key={index} className="flex flex-col gap-2">
                    <span className="h-5 w-24 rounded-tag bg-skeleton" />
                    <span className="h-12 rounded-control bg-skeleton" />
                </div>
            ))}
            <span className="h-11 rounded-control bg-skeleton" />
        </div>
    );
}
