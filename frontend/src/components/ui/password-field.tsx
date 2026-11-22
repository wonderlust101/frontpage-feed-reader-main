'use client';

// Password field: the text field with a show/hide toggle inside its right edge. The toggle is a pressed/unpressed
// button with one fixed name ("Show password"), so screen readers hear whether the password is showing.

import { useState, type ComponentProps } from 'react';
import { Icon } from './icon';
import { TextField } from './text-field';

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, 'type' | 'action'>;

// Renders a password input that the reader can reveal; every other prop (and a ref) goes to the underlying input.
export function PasswordField(props: PasswordFieldProps) {
    const [visible, setVisible] = useState(false);

    return (
        <TextField
            {...props}
            type={visible ? 'text' : 'password'}
            spellCheck={false}
            autoCapitalize="none"
            action={
                <button
                    type="button"
                    aria-pressed={visible}
                    aria-controls={props.id}
                    onClick={() => setVisible(!visible)}
                    className="grid size-11 place-items-center rounded-toggle text-ink-2 hover:bg-ground-2 hover:text-ink"
                >
                    <Icon name={visible ? 'hide-password' : 'show-password'} label="Show password" />
                </button>
            }
        />
    );
}
