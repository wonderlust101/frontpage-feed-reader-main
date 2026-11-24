// Code style for every TypeScript package. ESLint Stylistic formats TS/TSX/MJS (`eslint --fix`); Prettier formats the rest.
// Prettier would put a brace-free `if` body on the same line, so it doesn't touch these files.

import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

const BASE = stylistic.configs.customize({
    indent: 4,
    quotes: 'single',
    semi: true,
    jsx: true,
    arrowParens: true,
    braceStyle: '1tbs',
    blockSpacing: true,
    quoteProps: 'as-needed',
});

export const style = [
    {
        files: ['**/*.{ts,tsx,mts,cts,mjs}'],
        languageOptions: { parser: tseslint.parser },
        plugins: { '@stylistic': stylistic },
        rules: {
            ...BASE.rules,
            '@stylistic/nonblock-statement-body-position': ['error', 'below'],
            '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],
            '@stylistic/jsx-quotes': ['error', 'prefer-double'],
            '@stylistic/quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: 'avoidEscape' }],
            '@stylistic/operator-linebreak': ['error', 'after', { overrides: { '?': 'before', ':': 'before', '|': 'before', '&': 'before' } }],
            '@stylistic/jsx-one-expression-per-line': 'off',
            '@stylistic/jsx-wrap-multilines': 'off',
            '@stylistic/jsx-curly-newline': 'off',
            '@stylistic/multiline-ternary': 'off',
            '@stylistic/list-style': 'off',
            '@stylistic/indent-binary-ops': 'off',
            '@stylistic/max-len': [
                'error',
                { code: 160, tabWidth: 4, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreRegExpLiterals: true },
            ],
            '@stylistic/lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
            '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],
            '@stylistic/padded-blocks': ['error', 'never'],
            curly: 'off',
        },
    },
];
