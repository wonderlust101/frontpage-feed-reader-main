// Code style for every TypeScript package. ESLint Stylistic formats TS/TSX/MJS (`eslint --fix`); Prettier formats the rest.
// Prettier would put a brace-free `if` body on the same line, so it doesn't touch these files.

import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

const TS_FILES = ['**/*.{ts,tsx,mts,cts}'];

const CONTROL_FLOW = ['if', 'for', 'while', 'do', 'switch', 'try'];

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
            '@stylistic/padding-line-between-statements': [
                'error',
                { blankLine: 'always', prev: 'directive', next: '*' },
                { blankLine: 'always', prev: 'import', next: '*' },
                { blankLine: 'any', prev: 'import', next: 'import' },
                { blankLine: 'always', prev: ['const', 'let'], next: '*' },
                { blankLine: 'any', prev: ['const', 'let'], next: ['const', 'let'] },
                { blankLine: 'always', prev: '*', next: CONTROL_FLOW },
                { blankLine: 'always', prev: CONTROL_FLOW, next: '*' },
                { blankLine: 'always', prev: '*', next: 'return' },
                { blankLine: 'always', prev: '*', next: 'function' },
            ],
            '@stylistic/lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
            '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],
            '@stylistic/padded-blocks': ['error', 'never'],
            curly: 'off',
        },
    },
];

// typescript-eslint's syntax-only rules. The type-aware ones need TypeScript's JS API, which the backend's TS 7 doesn't have.
export const typescript = [
    ...tseslint.configs.recommended.map((config) => ({ ...config, files: TS_FILES })),
    {
        files: TS_FILES,
        rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
    },
];
