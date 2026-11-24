'use client';

// A category's quick actions, on its row in the panel or drawer: pick its color from the brand fields and, when the
// caller allows them, rename it or delete it (guests only recolor, saved on this device). Changes apply at once.
// Deleting is undoable (its feeds move to Uncategorized), so the caller offers Undo rather than asking first; it sits
// apart from the rest. After a delete, focus moves to the neighbouring row, and after a rename it stays in the field,
// so a keyboard user keeps their place.

import { useEffect, useId, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { ShellMenu } from '@/components/app-shell/shell-menu';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { TextField } from '@/components/ui/text-field';
import type { FieldId } from '../fields';
import { FieldPicker } from './field-picker';

type CategoryRowMenuProps = {
    category: { name: string; fieldId: FieldId };
    onRecolor: (fieldId: FieldId) => void;
    onRename?: (name: string) => string | undefined;
    onDelete?: () => void;
};

// Renders the "more" button and its panel; `onRename` returns why a name can't be used, or nothing when it was applied.
export function CategoryRowMenu({ category, onRecolor, onRename, onDelete }: CategoryRowMenuProps) {
    const id = useId();
    const [error, setError] = useState<string | undefined>();
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Shows the current name when it changes elsewhere (an Undo), leaving the field alone while it is being edited.
        if (nameRef.current && document.activeElement !== nameRef.current)
            nameRef.current.value = category.name;
    }, [category.name]);

    // Applies the new name, or shows why not.
    function handleRename(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const name = String(new FormData(event.currentTarget).get('name') ?? '');

        setError(onRename?.(name));
    }

    // Closes the panel, deletes, then focuses the next row's link (or the previous one, at the end of the list).
    function handleDelete(event: MouseEvent<HTMLButtonElement>) {
        const row = event.currentTarget.closest('li');
        const neighbour = (row?.nextElementSibling ?? row?.previousElementSibling)?.querySelector<HTMLElement>('a');

        event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover();
        onDelete?.();
        requestAnimationFrame(() => neighbour?.focus());
    }

    return (
        <ShellMenu
            label={onRename ? `${category.name}: actions` : `${category.name}: color`}
            placement="row"
            trigger={
                <>
                    <Icon name="more" />
                    <span className="sr-only">
                        {onRename ? 'Actions' : 'Color'} for {category.name}
                    </span>
                </>
            }
            triggerClassName="grid size-11 place-items-center rounded-control text-ink-2 hover:bg-ink/8 hover:text-ink lg:size-8 pointer-coarse:size-11"
        >
            <p className="truncate font-display text-title leading-tight font-bold tracking-[-0.02em]">{category.name}</p>
            {onRename && (
                <form onSubmit={handleRename} noValidate className="mt-4 flex flex-col items-start gap-3">
                    <TextField
                        ref={nameRef}
                        id={`${id}-name`}
                        name="name"
                        label="Name"
                        defaultValue={category.name}
                        error={error}
                        onInput={() => setError(undefined)}
                        className="w-full"
                    />
                    <Button type="submit" variant="secondary">
                        Rename
                    </Button>
                </form>
            )}
            <div className="mt-5">
                <p className="mb-2 text-ui font-semibold">Color</p>
                <FieldPicker name={`${id}-field`} legend={category.name} value={category.fieldId} onChange={onRecolor} />
                {!onRename && <p className="mt-2 text-meta text-ink-2">Saved on this device.</p>}
            </div>
            {onDelete && (
                <div className="mt-6 border-t border-edge pt-3">
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="flex min-h-11 w-full items-center gap-3 rounded-toggle px-3 text-left text-ui font-semibold text-error hover:bg-ink/6 lg:min-h-10"
                    >
                        <Icon name="delete" />
                        Delete category
                        <span className="ml-auto text-meta font-medium text-ink-2">Feeds stay</span>
                    </button>
                </div>
            )}
        </ShellMenu>
    );
}
