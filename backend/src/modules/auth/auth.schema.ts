// Better Auth's four core tables (users, sessions, accounts, verifications), written by hand to match its built-in schema.
// The adapter finds tables by model name (mapped in auth.service.ts) and fields by the camelCase property names; SQL names are snake_case.
// Better Auth creates text ids, so every user_id elsewhere in the schema is text too.

import { relations } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// One row per account: the person's name and email. Every user-owned table in the app points here.
export const users = pgTable('users', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// One row per signed-in browser or device. The session cookie holds `token`; deleting the row signs that device out.
export const sessions = pgTable(
    'sessions',
    {
        id: text('id').primaryKey(),
        token: text('token').notNull().unique(),
        userId: text('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
        ipAddress: text('ip_address'),
        userAgent: text('user_agent'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index('sessions_user_id_idx').on(t.userId)],
);

// How a user signs in: one row per method. Email sign-in stores the password hash here (provider 'credential');
// social sign-in (e.g. GitHub) would add rows holding that provider's tokens.
export const accounts = pgTable(
    'accounts',
    {
        id: text('id').primaryKey(),
        accountId: text('account_id').notNull(),
        providerId: text('provider_id').notNull(),
        userId: text('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        password: text('password'),
        accessToken: text('access_token'),
        refreshToken: text('refresh_token'),
        idToken: text('id_token'),
        accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
        refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
        scope: text('scope'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index('accounts_user_id_idx').on(t.userId)],
);

// Short-lived one-time tokens, such as password-reset links. Each row expires at `expires_at` and is deleted once used.
export const verifications = pgTable(
    'verifications',
    {
        id: text('id').primaryKey(),
        identifier: text('identifier').notNull(),
        value: text('value').notNull(),
        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index('verifications_identifier_idx').on(t.identifier)],
);

// For Better Auth's joins: reading a session fetches its user in the same query.
export const usersRelations = relations(users, ({ many }) => ({ sessions: many(sessions), accounts: many(accounts) }));
export const sessionsRelations = relations(sessions, ({ one }) => ({ user: one(users, { fields: [sessions.userId], references: [users.id] }) }));
export const accountsRelations = relations(accounts, ({ one }) => ({ user: one(users, { fields: [accounts.userId], references: [users.id] }) }));
