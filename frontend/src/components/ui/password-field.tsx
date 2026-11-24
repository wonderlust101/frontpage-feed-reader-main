'use client';

// The toggle is a pressed/unpressed button with one fixed name, so screen readers hear whether the password shows.
// While Caps Lock is on, the hint row says so.

import { useState, type ComponentProps, type KeyboardEvent } from 'react';
import { Icon } from './icon';
import { TextField } from './text-field';

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, 'type' | 'action'>;

// Every other prop (and a ref) goes to the input.
export function PasswordField({ hint, onKeyDown, onKeyUp, onBlur, ...props }: PasswordFieldProps) {
    const [visible, setVisible] = useState(false);
    const [capsLock, setCapsLock] = useState(false);

    function readCapsLock(event: KeyboardEvent<HTMLInputElement>) {
        setCapsLock(event.getModifierState('CapsLock'));
    }

    return (
        <TextField
            {...props}
            hint={capsLock ? 'Caps Lock is on.' : hint}
            onKeyDown={(event) => {
                readCapsLock(event);
                onKeyDown?.(event);
            }}
            onKeyUp={(event) => {
                readCapsLock(event);
                onKeyUp?.(event);
            }}
            onBlur={(event) => {
                setCapsLock(false);
                onBlur?.(event);
            }}
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
