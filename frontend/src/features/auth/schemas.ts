// Limits come from @frontpage/shared, the same values the API enforces. Sign-in never checks password length, so
// accounts made under older rules can still sign in. zod/mini keeps the browser bundle to the checks used here.

import { CODE_LENGTH, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@frontpage/shared';
import { z } from 'zod/mini';

// Zod otherwise probes for `new Function`, which the Content Security Policy blocks, so every page would log a violation.
z.config({ jitless: true });

export { CODE_LENGTH, CODE_LIFETIME_MINUTES, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@frontpage/shared';

export const NEW_PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters. Longer is stronger: try a few unrelated words.`;

const MAX_NAME_LENGTH = 100;

const email = z.pipe(
    z.string().check(z.minLength(1, { error: 'Enter your email address.' })),
    z.email({ error: 'Enter an email address like name@example.com.' }),
);

const currentPassword = z.string().check(z.minLength(1, { error: 'Enter your password.' }));

const newPassword = z
    .string()
    .check(
        z.minLength(MIN_PASSWORD_LENGTH, { error: `Use at least ${MIN_PASSWORD_LENGTH} characters.` }),
        z.maxLength(MAX_PASSWORD_LENGTH, { error: `Use at most ${MAX_PASSWORD_LENGTH} characters.` }),
    );

const name = z
    .string()
    .check(z.trim(), z.minLength(1, { error: 'Enter your name.' }), z.maxLength(MAX_NAME_LENGTH, { error: `Use at most ${MAX_NAME_LENGTH} characters.` }));

const code = z.pipe(
    z.pipe(
        z.string(),
        z.transform((value: string) => value.replace(/\s/g, '')),
    ),
    z.string().check(z.regex(new RegExp(`^\\d{${CODE_LENGTH}}$`), { error: `Enter the ${CODE_LENGTH}-digit code from the email.` })),
);

export const signInSchema = z.object({ email, password: currentPassword });

export const signUpSchema = z.object({ name, email, password: newPassword });

export const emailSchema = z.object({ email });

export const codeSchema = z.object({ code });

export const resetPasswordSchema = z.object({ password: newPassword });

export const changePasswordSchema = z.object({ currentPassword, newPassword, revokeOtherSessions: z.boolean() }).check(
    z.refine((values) => values.newPassword !== values.currentPassword, {
        path: ['newPassword'],
        error: 'Choose a password that is different from your current one.',
    }),
);
