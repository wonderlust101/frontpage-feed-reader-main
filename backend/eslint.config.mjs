// Guard rails sit above today's highest values, so they flag new outliers without pushing needless extraction.

import { style, typescript } from '@frontpage/eslint-config';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    globalIgnores(['drizzle/**', 'node_modules/**']),
    ...typescript,
    ...style,
    {
        files: ['src/**/*.ts'],
        rules: {
            complexity: ['warn', 20],
            'max-depth': ['warn', 3],
            'max-params': ['warn', 5],
            'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
        },
    },
]);
