import { style, typescript } from '@frontpage/eslint-config';
import { defineConfig } from 'eslint/config';

export default defineConfig([...typescript, ...style]);
