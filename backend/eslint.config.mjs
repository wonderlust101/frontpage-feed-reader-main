// ESLint for the backend. Prettier owns formatting; ESLint only adds rules Prettier can't express,
// like `curly`: every if/else/loop body needs braces, so it always sits on its own line.

import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
    globalIgnores(['drizzle/**', 'node_modules/**']),
    {
        files: ['**/*.ts'],
        languageOptions: { parser: tseslint.parser },
        rules: {
            curly: ['error', 'all'],
        },
    },
]);
