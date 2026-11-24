'use client';

// Manage: the page for bulk work on a reader's categories and feeds. One block per category, in order, headed by its
// field dot and name, with buttons to move it up or down and its quick actions (rename, color, delete); then its
// feeds, each with a "Move to" select and Unsubscribe. Uncategorized comes last, and a new category is added at the
// foot. Unsubscribing drops a feed's history, so it asks first and can't be undone; everything else applies at once
// and the caller offers Undo. Controlled: the caller owns the library.

import { useId, useState, type FormEvent } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Icon } from '@/components/ui/icon';
import { TextField } from '@/components/ui/text-field';
import { categoryFieldById, NO_FIELD } from '../fields';
import { addCategory, deleteCategory, isNameTaken, moveCategory, placeFeed, unsubscribe, updateCategory, type Library } from '../library';
import { CategoryRowMenu } from './category-row-menu';

type ManageCategoriesProps = {
    library: Library;
    onChange: (library: Library, message: string, undoable?: boolean) => void;
};

const ICON_BUTTON_CLASSES =
    'grid size-11 place-items-center rounded-control text-ink-2 hover:bg-ink/8 hover:text-ink disabled:pointer-events-none disabled:opacity-30 lg:size-9';

// Renders the page body; `onChange` receives the edited library, a sentence saying what changed and whether Undo fits.
export function ManageCategories({ library, onChange }: ManageCategoriesProps) {
    const id = useId();
    const [leaving, setLeaving] = useState<string | null>(null);
    const [newError, setNewError] = useState<string | undefined>();
    const destinations = [...library.categories.map((category) => ({ id: category.id, name: category.name })), { id: '', name: 'Uncategorized' }];

    // Says why `name` can't be used, or nothing.
    function nameProblem(name: string, exceptId?: string) {
        if (name.trim() === '') {
            return 'Give it a name.';
        }
        return isNameTaken(library, name, exceptId) ? `You already have a category called ${name.trim()}.` : undefined;
    }

    // Adds the typed category, or shows why not.
    function handleAdd(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const name = String(new FormData(form).get('name') ?? '');
        const problem = nameProblem(name);
        setNewError(problem);
        if (!problem) {
            onChange(addCategory(library, crypto.randomUUID(), name), `Added ${name.trim()}.`);
            form.reset();
        }
    }

    // Renders one feed row with its Move to select and Unsubscribe button.
    function feedRow(feed: string, categoryId: string) {
        return (
            <li key={feed} className="flex min-h-14 items-center gap-3 border-b border-edge py-1.5 last:border-b-0">
                <Icon name="feed" className="text-muted" />
                <span className="min-w-0 flex-1 truncate text-ui font-medium">{feed}</span>
                <label className="sr-only" htmlFor={`${id}-${feed}`}>
                    Move {feed} to
                </label>
                <select
                    id={`${id}-${feed}`}
                    value={categoryId}
                    onChange={(event) => {
                        const to = event.target.value;
                        const toName = destinations.find((destination) => destination.id === to)?.name;
                        onChange(placeFeed(library, feed, to === '' ? null : to), `Moved ${feed} to ${toName}.`);
                    }}
                    className="h-10 max-w-[45%] rounded-control border-[1.5px] border-control-edge bg-control-fill px-3 text-meta font-semibold text-ink"
                >
                    {destinations.map((destination) => (
                        <option key={destination.id} value={destination.id}>
                            {destination.name}
                        </option>
                    ))}
                </select>
                <button type="button" onClick={() => setLeaving(feed)} className={`${ICON_BUTTON_CLASSES} hover:text-error`}>
                    <Icon name="delete" />
                    <span className="sr-only">Unsubscribe from {feed}</span>
                </button>
            </li>
        );
    }

    return (
        <div className="flex max-w-3xl flex-col gap-10">
            <div>
                <h1 className="type-display underline decoration-field-lemon decoration-[0.12em] underline-offset-[0.14em] [text-decoration-skip-ink:none]">
                    Manage
                </h1>
                <p className="mt-3 text-ui text-ink-2">Order your categories, give each a color and move feeds between them. Changes apply as you make them.</p>
            </div>

            {library.categories.map((category, index) => {
                const field = categoryFieldById(category.fieldId) ?? NO_FIELD;
                return (
                    <section key={category.id} aria-labelledby={`${id}-${category.id}`}>
                        <div className="flex items-center gap-3 border-b-[1.5px] border-ink pb-2">
                            <span aria-hidden="true" className="fill-edge size-3.5 flex-none rounded-full" style={{ background: field.color }} />
                            <h2
                                id={`${id}-${category.id}`}
                                className="min-w-0 flex-1 truncate font-display text-title leading-tight font-bold tracking-[-0.02em]"
                            >
                                {category.name}
                            </h2>
                            <span className="text-meta text-muted tabular-nums">
                                {category.feeds.length} {category.feeds.length === 1 ? 'feed' : 'feeds'}
                            </span>
                            <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => onChange(moveCategory(library, category.id, -1), `Moved ${category.name} up.`)}
                                className={ICON_BUTTON_CLASSES}
                            >
                                <Icon name="move-up" />
                                <span className="sr-only">Move {category.name} up</span>
                            </button>
                            <button
                                type="button"
                                disabled={index === library.categories.length - 1}
                                onClick={() => onChange(moveCategory(library, category.id, 1), `Moved ${category.name} down.`)}
                                className={ICON_BUTTON_CLASSES}
                            >
                                <Icon name="move-down" />
                                <span className="sr-only">Move {category.name} down</span>
                            </button>
                            <CategoryRowMenu
                                category={category}
                                onRename={(name) => {
                                    const problem = nameProblem(name, category.id);
                                    if (!problem) {
                                        onChange(updateCategory(library, category.id, { name: name.trim() }), `Renamed ${category.name} to ${name.trim()}.`);
                                    }
                                    return problem;
                                }}
                                onRecolor={(fieldId) =>
                                    onChange(updateCategory(library, category.id, { fieldId }), `${category.name} is now ${categoryFieldById(fieldId)?.name}.`)
                                }
                                onDelete={() => onChange(deleteCategory(library, category.id), `Deleted ${category.name}. Its feeds are in Uncategorized.`)}
                            />
                        </div>
                        {category.feeds.length > 0 ? (
                            <ul>{category.feeds.map((feed) => feedRow(feed, category.id))}</ul>
                        ) : (
                            <p className="py-4 text-ui text-muted">No feeds here yet. Add one with Add feed, or move one in.</p>
                        )}
                    </section>
                );
            })}

            {library.uncategorized.length > 0 && (
                <section aria-labelledby={`${id}-uncategorized`}>
                    <div className="flex items-center gap-3 border-b-[1.5px] border-ink pb-2">
                        <span aria-hidden="true" className="fill-edge size-3.5 flex-none rounded-full" style={{ background: NO_FIELD.color }} />
                        <h2 id={`${id}-uncategorized`} className="flex-1 font-display text-title leading-tight font-bold tracking-[-0.02em]">
                            Uncategorized
                        </h2>
                    </div>
                    <ul>{library.uncategorized.map((feed) => feedRow(feed, ''))}</ul>
                </section>
            )}

            <form onSubmit={handleAdd} noValidate className="max-w-md">
                <TextField
                    id={`${id}-new`}
                    name="name"
                    label="New category"
                    placeholder="Film & TV"
                    error={newError}
                    onInput={() => setNewError(undefined)}
                    action={
                        <button type="submit" className="min-h-10 rounded-toggle px-3 text-meta font-bold hover:bg-ink/8">
                            Add
                        </button>
                    }
                />
            </form>

            <ConfirmDialog
                open={leaving !== null}
                title={`Unsubscribe from ${leaving}?`}
                confirmLabel="Unsubscribe"
                onCancel={() => setLeaving(null)}
                onConfirm={() => {
                    if (leaving) {
                        onChange(unsubscribe(library, leaving), `Unsubscribed from ${leaving}.`, false);
                    }
                    setLeaving(null);
                }}
            >
                Its articles leave your feed, along with what you&apos;ve read and saved from it. You can subscribe again later, starting fresh.
            </ConfirmDialog>
        </div>
    );
}
