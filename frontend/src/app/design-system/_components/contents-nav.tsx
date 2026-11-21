'use client';

// Sticky contents rail for the design system page. It marks the section currently in view (scroll-spy),
// so the reader always sees where they are.

import { useEffect, useState } from 'react';

type ContentsEntry = { id: string; label: string };

// Renders the contents list; the section nearest the top of the viewport gets aria-current and a Lemon marker.
export function ContentsNav({ entries }: { entries: ContentsEntry[] }) {
    const [currentId, setCurrentId] = useState(entries[0]?.id);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (observed) => {
                const visible = observed.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) {
                    setCurrentId(visible[0].target.id);
                }
            },
            { rootMargin: '-20% 0px -70% 0px' },
        );
        entries.forEach((entry) => {
            const section = document.getElementById(entry.id);
            if (section) {
                observer.observe(section);
            }
        });
        return () => observer.disconnect();
    }, [entries]);

    return (
        <nav aria-label="Contents" className="hidden lg:block">
            <ul className="sticky top-24 space-y-1 border-t-2 border-rule pt-3">
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
                                    className={`size-2 flex-none rounded-full ${isCurrent ? 'bg-field-lemon shadow-[inset_0_0_0_1px_var(--color-ink)]' : 'bg-transparent'}`}
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
