import { style } from '@frontpage/eslint-config';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([globalIgnores(['drizzle/**', 'node_modules/**']), ...style]);
