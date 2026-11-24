'use client';

// Add feed, the first thing in the category panel: an ink-edged button that fills Lemon on hover. For readers it opens a
// modal form: the site or feed address and the category it goes in (or none). For guests it is a link to sign-up with a
// lock, since feeds are kept with an account. The form checks only that the address is a web address; finding the
// feed behind it is the API's job.

import Link from 'next/link';
import { useId, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { webAddress } from '../web-address';

type AddFeedProps = {
    categories: { id: string; name: string }[];
    onAdd: (address: URL, categoryId: string | null) => void;
};

const ADD_FEED_CLASSES =
    'flex min-h-11 w-full items-center gap-2.5 rounded-control border-[1.5px] border-ink bg-workspace px-3 text-ui font-bold text-ink transition-colors duration-150 hover:bg-field-lemon hover:text-on-field lg:min-h-10';

// Renders the button and its form; `onAdd` receives the address and the chosen category id (null for none).
export function AddFeed({ categories, onAdd }: AddFeedProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const id = useId();
    const [error, setError] = useState<string | undefined>();

    // Checks the address, hands it on and closes; a bad address keeps the form open with the reason.
    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const address = webAddress(String(data.get('address') ?? ''));
        if (!address) {
            setError('That isn’t a web address. Try a site like css-tricks.com, or paste its feed link.');
            return;
        }
        const categoryId = String(data.get('category') ?? '');
        onAdd(address, categoryId === '' ? null : categoryId);
        form.reset();
        dialogRef.current?.close();
    }

    return (
        <>
            <button type="button" onClick={() => dialogRef.current?.showModal()} className={ADD_FEED_CLASSES}>
                <Icon name="add-feed" />
                Add feed
            </button>
            <dialog
                ref={dialogRef}
                aria-labelledby={`${id}-title`}
                onClose={() => setError(undefined)}
                className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-stage border-[1.5px] border-ink bg-workspace p-6 text-ink backdrop:bg-ink/40 md:p-8"
            >
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                    <div>
                        <h2 id={`${id}-title`} className="font-display text-title leading-tight font-bold tracking-[-0.02em]">
                            Add a feed
                        </h2>
                        <p className="mt-2 text-ui text-ink-2">Paste a site or its feed link. Frontpage finds the feed and starts collecting.</p>
                    </div>
                    <TextField
                        id={`${id}-address`}
                        name="address"
                        label="Site or feed address"
                        placeholder="css-tricks.com"
                        inputMode="url"
                        autoComplete="url"
                        spellCheck={false}
                        error={error}
                        onInput={() => setError(undefined)}
                    />
                    <Select id={`${id}-category`} name="category" label="Category" defaultValue="">
                        <option value="">No category</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </Select>
                    <div className="mt-1 flex flex-wrap justify-end gap-3">
                        <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
                            Cancel
                        </Button>
                        <Button type="submit">Add feed</Button>
                    </div>
                </form>
            </dialog>
        </>
    );
}

// Renders Add feed for guests: the same button, locked, leading to sign-up.
export function AddFeedLocked() {
    return (
        <Link href="/sign-up" className={ADD_FEED_CLASSES}>
            <Icon name="add-feed" />
            Add feed
            <span className="ml-auto flex opacity-70">
                <Icon name="locked" size="inline" />
            </span>
            <span className="sr-only">, with an account</span>
        </Link>
    );
}
