// Auth rules both sides must agree on: the API enforces them (Better Auth) and the frontend forms check and show them.
// Change them here only, so the forms never promise something the API rejects.

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const CODE_LENGTH = 6;
export const CODE_LIFETIME_MINUTES = 5;
export const RESET_TOKEN_MINUTES = 60;
