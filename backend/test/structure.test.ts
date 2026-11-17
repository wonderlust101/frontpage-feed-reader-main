// Guards the layout described in test/README.md so the test folder can't quietly drift.
// If this fails, move/rename the file it names (or update the README and this test together).

import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const TEST_DIR = import.meta.dir;
const SRC_DIR = join(TEST_DIR, '../src');
const FIXTURES_DIR = join(TEST_DIR, 'fixtures/feeds');

const ROOT_EXCEPTIONS = new Set(['setup.ts', 'README.md', 'structure.test.ts']);
const SPECIAL_DIRS = new Set(['helpers', 'fixtures', 'live']);

/** Every file under `dir`, at any depth. */
function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);
        return entry.isDirectory() ? walk(full) : [full];
    });
}

/** A path relative to the test folder, always with forward slashes (also on Windows). */
const rel = (path: string) => relative(TEST_DIR, path).split(sep).join('/');
const allFiles = walk(TEST_DIR).map(rel);
const codeFiles = allFiles.filter((f) => !f.startsWith('fixtures/'));
const testFiles = codeFiles.filter((f) => f.endsWith('.test.ts'));

describe('test folder structure', () => {
    test('only known files sit at the root of test/', () => {
        const strays = codeFiles.filter((f) => !f.includes('/') && !ROOT_EXCEPTIONS.has(f) && !f.endsWith('.test.ts'));
        expect(strays).toEqual([]);
    });

    test('every unit/integration test mirrors a file in src/', () => {
        const orphans = testFiles
            .filter((f) => !SPECIAL_DIRS.has(f.split('/')[0]!) && !ROOT_EXCEPTIONS.has(f))
            .filter((f) => {
                const base = f.replace(/\.test\.ts$/, '');
                return !existsSync(join(SRC_DIR, `${base}.ts`)) && !existsSync(join(SRC_DIR, base, 'index.ts'));
            });
        expect(orphans).toEqual([]);
    });

    test('helpers/ holds no tests', () => {
        expect(testFiles.filter((f) => f.startsWith('helpers/'))).toEqual([]);
    });

    test('network tests live in live/ and are named *.live.test.ts', () => {
        const misnamed = testFiles.filter((f) => f.startsWith('live/') !== f.endsWith('.live.test.ts'));
        expect(misnamed).toEqual([]);
    });

    test('live tests are opt-in (skipped unless LIVE_FEEDS is set)', () => {
        const ungated = testFiles
            .filter((f) => f.startsWith('live/'))
            .filter((f) => !readFileSync(join(TEST_DIR, f), 'utf8').includes('skipIf(!process.env.LIVE_FEEDS)'));
        expect(ungated).toEqual([]);
    });

    test('code files are TypeScript', () => {
        expect(codeFiles.filter((f) => !f.endsWith('.ts') && !f.endsWith('.md'))).toEqual([]);
    });
});

describe('feed fixtures', () => {
    test('only curated/ and odd/ exist', () => {
        expect(readdirSync(FIXTURES_DIR).sort()).toEqual(['curated', 'odd']);
    });

    test('curated manifest and files match one-to-one', () => {
        const manifest: Array<{ file: string }> = JSON.parse(
            readFileSync(join(FIXTURES_DIR, 'curated/manifest.json'), 'utf8'),
        );
        const listed = manifest.map((m) => m.file).sort();
        const onDisk = readdirSync(join(FIXTURES_DIR, 'curated'))
            .filter((f) => f !== 'manifest.json')
            .sort();
        expect(onDisk).toEqual(listed);
    });

    test('every odd fixture is used by at least one test', () => {
        const sources = testFiles.map((f) => readFileSync(join(TEST_DIR, f), 'utf8')).join('\n');
        const helperSources = codeFiles
            .filter((f) => f.startsWith('helpers/'))
            .map((f) => readFileSync(join(TEST_DIR, f), 'utf8'))
            .join('\n');
        const unused = readdirSync(join(FIXTURES_DIR, 'odd')).filter(
            (f) => !sources.includes(`odd/${f}`) && !helperSources.includes(`odd/${f}`),
        );
        expect(unused).toEqual([]);
    });
});
