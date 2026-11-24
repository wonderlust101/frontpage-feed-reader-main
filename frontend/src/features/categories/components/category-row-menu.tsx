'use client';

// A category's quick actions, on its row in the panel or drawer (and on the Manage page): rename, pick its color from
// the brand fields, open Manage for its feeds (when `onManage` is given), or delete it. Changes apply at once.
// Deleting is undoable (its feeds move to Uncategorized), so the caller offers Undo in a toast rather than asking first.

import { useId, useState, type FormEvent, type MouseEvent } from 'react';
import { ShellMenu } from '@/components/app-shell/shell-menu';
import { Icon } from '@/components/ui/icon';
import { TextField } from '@/components/ui/text-field';
import type { FieldId } from '../fields';
import { FieldPicker } from './field-picker';

type CategoryRowMenuProps = {
    category: { name: string; fieldId: FieldId };
    onRename: (name: string) => string | undefined;
    onRecolor: (fieldId: FieldId) => void;
    onManage?: () => void;
    onDelete: () => void;
};

const ACTION_CLASSES = 'flex min-h-11 w-full items-center gap-3 rounded-toggle px-3 text-left text-ui font-semibold hover:bg-ink/6 lg:min-h-10';

// Renders the "more" button and its panel; `onRename` returns why a name can't be used, or nothing when it was applied.
export function CategoryRowMenu({ category, onRename, onRecolor, onManage, onDelete }: CategoryRowMenuProps) {
    const id = useId();
    const [error, setError] = useState<string | undefined>();

    // Applies the new name, or shows why not.
    function handleRename(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const name = String(new FormData(event.currentTarget).get('name') ?? '');
        setError(onRename(name));
    }

    // Closes the panel, then runs `action`.
    function closeThen(action: () => void) {
        return (event: MouseEvent<HTMLButtonElement>) => {
            event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover();
            action();
        };
    }

    return (
        <ShellMenu
            label={`${category.name}: actions`}
            placement="row"
            trigger={
                <>
                    <Icon name="more" />
                    <span className="sr-only">Actions for {category.name}</span>
                </>
            }
            triggerClassName="grid size-9 place-items-center rounded-control text-ink-2 hover:bg-ink/8 hover:text-ink lg:size-8"
        >
            <p className="truncate font-display text-title leading-tight font-bold tracking-[-0.02em]">{category.name}</p>
            <form onSubmit={handleRename} noValidate className="mt-4">
                <TextField
                    key={category.name}
                    id={`${id}-name`}
                    name="name"
                    label="Name"
                    defaultValue={category.name}
                    error={error}
                    onInput={() => setError(undefined)}
                    action={
                        <button type="submit" className="min-h-10 rounded-toggle px-3 text-meta font-bold hover:bg-ink/8">
                            Save
                        </button>
                    }
                />
            </form>
            <div className="mt-5">
                <p className="mb-2 text-ui font-semibold">Color</p>
                <FieldPicker name={`${id}-field`} legend={category.name} value={category.fieldId} onChange={onRecolor} />
            </div>
            <div className="mt-5 flex flex-col border-t border-edge pt-2">
                {onManage && (
                    <button type="button" onClick={closeThen(onManage)} className={ACTION_CLASSES}>
                        <Icon name="settings" />
                        Move or remove feeds
                    </button>
                )}
                <button type="button" onClick={closeThen(onDelete)} className={`${ACTION_CLASSES} text-error`}>
                    <Icon name="delete" />
                    Delete category
                    <span className="ml-auto text-meta font-medium text-muted">Feeds stay</span>
                </button>
            </div>
        </ShellMenu>
    );
}
