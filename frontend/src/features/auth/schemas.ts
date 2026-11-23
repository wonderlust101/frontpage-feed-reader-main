// Zod schemas for the auth forms: each form's rules and messages live here, and React Hook Form reads them through
// zodResolver. Password limits match the API's Better Auth settings (8 to 128 characters); the API checks them again.
// Sign-in only asks for a password, never its length, so accounts made under older rules can still sign in.

import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const CODE_LENGTH = 6;

// How long an email code lasts: the API's email-code plugin default (expiresIn, 300 seconds).
export const CODE_LIFETIME_MINUTES = 5;

// The hint under every new-password field. Length is what makes a password strong, and unrelated words make length
// easy to remember (a familiar phrase or a quote is easy to guess, so the words should not belong together).
export const NEW_PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters. Longer is stronger: try a few unrelated words.`;

const MAX_NAME_LENGTH = 100;

const email = z
    .string()
    .min(1, { error: 'Enter your email address.' })
    .pipe(z.email({ error: 'Enter an email address like name@example.com.' }));

const currentPassword = z.string().min(1, { error: 'Enter your password.' });

const newPassword = z
    .string()
    .min(MIN_PASSWORD_LENGTH, { error: `Use at least ${MIN_PASSWORD_LENGTH} characters.` })
    .max(MAX_PASSWORD_LENGTH, { error: `Use at most ${MAX_PASSWORD_LENGTH} characters.` });

const name = z
    .string()
    .trim()
    .min(1, { error: 'Enter your name.' })
    .max(MAX_NAME_LENGTH, { error: `Use at most ${MAX_NAME_LENGTH} characters.` });

const code = z
    .string()
    .transform((value) => value.replace(/\s/g, ''))
    .pipe(z.string().regex(new RegExp(`^\\d{${CODE_LENGTH}}$`), { error: `Enter the ${CODE_LENGTH}-digit code from the email.` }));

export const signInSchema = z.object({ email, password: currentPassword });

export const signUpSchema = z.object({ name, email, password: newPassword });

export const emailSchema = z.object({ email });

export const codeSchema = z.object({ code });

export const resetPasswordSchema = z.object({ password: newPassword });

export const changePasswordSchema = z
    .object({ currentPassword, newPassword, revokeOtherSessions: z.boolean() })
    .refine((values) => values.newPassword !== values.currentPassword, {
        path: ['newPassword'],
        error: 'Choose a password that is different from your current one.',
    });
