'use client';

import { useEffect, useState } from 'react';

type ContentsEntry = { id: string; label: string };

// The section nearest the top of the viewport is current.
export function ContentsNav({ entries }: { entries: ContentsEntry[] }) {
    const [currentId, setCurrentId] = useState(entries[0]?.id);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (observed) => {
                const visible = observed
                    .filter((observation) => observation.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

                if (visible[0])
                    setCurrentId(visible[0].target.id);
            },
            { rootMargin: '-20% 0px -70% 0px' },
        );

        entries.forEach((entry) => {
            const section = document.getElementById(entry.id);

            if (section)
                observer.observe(section);
        });

        return () => observer.disconnect();
    }, [entries]);

    return (
        <nav aria-label="Contents" className="hidden lg:block">
            <ul className="sticky top-24 space-y-1 rule-t pt-3">
                {entries.map((entry) => {
                    const isCurrent = entry.id === currentId;

                    return (
                        <li key={entry.id}>
                            <a
                                href={`#${entry.id}`}
                                aria-current={isCurrent ? 'location' : undefined}
                                className={`flex items-center gap-2 py-1 text-ui hover:text-ink hover:underline ${isCurrent ? 'font-semibold text-ink' : 'font-medium text-ink-2'}`}
                            >
                                <span
                                    className={`size-2 flex-none rounded-full ${isCurrent ? 'fill-edge bg-field-lemon' : 'bg-transparent'}`}
                                    aria-hidden="true"
                                />
                                {entry.label}
                            </a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
