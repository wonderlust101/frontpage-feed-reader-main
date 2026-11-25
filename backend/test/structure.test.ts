// Guards the layout described in test/README.md so the test folder can't quietly drift.
// If this fails, move/rename the file it names (or update the README and this test together).

import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { curatedFixtures, FIXTURES_DIR } from './helpers/fixtures';

const TEST_DIR = import.meta.dir;
const SRC_DIR = join(TEST_DIR, '../src');

const ROOT_EXCEPTIONS = new Set(['setup.ts', 'README.md', 'structure.test.ts']);
const SPECIAL_DIRS = new Set(['helpers', 'fixtures', 'live']);

const allFiles = walk(TEST_DIR).map(relativePath);
const codeFiles = allFiles.filter((file) => !file.startsWith('fixtures/'));
const testFiles = codeFiles.filter((file) => file.endsWith('.test.ts'));

describe('test folder structure', () => {
    test('only known files sit at the root of test/', () => {
        const strays = codeFiles.filter((file) => !file.includes('/') && !ROOT_EXCEPTIONS.has(file) && !file.endsWith('.test.ts'));

        expect(strays).toEqual([]);
    });

    test('every unit/integration test mirrors a file in src/', () => {
        const orphans = testFiles
            .filter((file) => !SPECIAL_DIRS.has(file.split('/')[0]!) && !ROOT_EXCEPTIONS.has(file))
            .filter((file) => {
                const base = file.replace(/\.test\.ts$/, '');

                return !existsSync(join(SRC_DIR, `${base}.ts`)) && !existsSync(join(SRC_DIR, base, 'index.ts'));
            });

        expect(orphans).toEqual([]);
    });

    test('helpers/ holds no tests', () => {
        expect(testFiles.filter((file) => file.startsWith('helpers/'))).toEqual([]);
    });

    test('network tests live in live/ and are named *.live.test.ts', () => {
        const misnamed = testFiles.filter((file) => file.startsWith('live/') !== file.endsWith('.live.test.ts'));

        expect(misnamed).toEqual([]);
    });

    test('live tests are opt-in (skipped unless LIVE_FEEDS is set)', () => {
        const ungated = testFiles
            .filter((file) => file.startsWith('live/'))
            .filter((file) => !readFileSync(join(TEST_DIR, file), 'utf8').includes('skipIf(!process.env.LIVE_FEEDS)'));

        expect(ungated).toEqual([]);
    });

    test('code files are TypeScript', () => {
        expect(codeFiles.filter((file) => !file.endsWith('.ts') && !file.endsWith('.md'))).toEqual([]);
    });
});

describe('feed fixtures', () => {
    test('only curated/ and odd/ exist', () => {
        expect(readdirSync(FIXTURES_DIR).sort()).toEqual(['curated', 'odd']);
    });

    test('curated manifest and files match one-to-one', () => {
        const listed = curatedFixtures.map((fixture) => fixture.file).sort();
        const onDisk = readdirSync(join(FIXTURES_DIR, 'curated'))
            .filter((file) => file !== 'manifest.json')
            .sort();

        expect(onDisk).toEqual(listed);
    });

    test('every odd fixture is used by at least one test', () => {
        const sources = testFiles.map((file) => readFileSync(join(TEST_DIR, file), 'utf8')).join('\n');
        const helperSources = codeFiles
            .filter((file) => file.startsWith('helpers/'))
            .map((file) => readFileSync(join(TEST_DIR, file), 'utf8'))
            .join('\n');
        const unused = readdirSync(join(FIXTURES_DIR, 'odd')).filter((file) => !sources.includes(`odd/${file}`) && !helperSources.includes(`odd/${file}`));

        expect(unused).toEqual([]);
    });
});

// Every file under `dir`, at any depth.
function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);

        return entry.isDirectory() ? walk(full) : [full];
    });
}

// A path relative to the test folder, always with forward slashes (also on Windows).
function relativePath(path: string): string {
    return relative(TEST_DIR, path).split(sep).join('/');
}
