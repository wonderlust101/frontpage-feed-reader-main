import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Prettier owns formatting; ESLint only adds rules Prettier can't express.
export default defineConfig([
    globalIgnores(['drizzle/**', 'node_modules/**']),
    {
        files: ['**/*.ts'],
        languageOptions: { parser: tseslint.parser },
        rules: {
            // Every if/else/for/while body needs braces, so Prettier always puts it on its own line.
            curly: ['error', 'all'],
        },
    },
]);
