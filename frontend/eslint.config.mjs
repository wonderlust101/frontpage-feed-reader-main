// The no-restricted-imports blocks enforce the folder rules in AGENTS.md: shared code never reaches into features or routes.

import { style } from '@frontpage/eslint-config';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const NO_FEATURES = { group: ['@/features/*'], message: 'Shared code is feature-agnostic: pass plain data in instead.' };

const NO_APP = { group: ['@/app/*'], message: 'Only routes live in app/; move shared code out of it.' };

const NO_APP_SHELL = { group: ['@/components/app-shell/*'], message: 'components/ui primitives import nothing app-specific.' };

const NO_COMPONENTS = { group: ['@/components/*'], message: 'lib/ holds framework-light helpers, not UI.' };

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    ...style,
    {
        files: ['src/components/**'],
        rules: { 'no-restricted-imports': ['error', { patterns: [NO_FEATURES, NO_APP] }] },
    },
    {
        files: ['src/components/ui/**'],
        rules: { 'no-restricted-imports': ['error', { patterns: [NO_FEATURES, NO_APP, NO_APP_SHELL] }] },
    },
    {
        files: ['src/features/**'],
        rules: { 'no-restricted-imports': ['error', { patterns: [NO_APP] }] },
    },
    {
        files: ['src/lib/**'],
        rules: { 'no-restricted-imports': ['error', { patterns: [NO_FEATURES, NO_APP, NO_COMPONENTS] }] },
    },
    globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
