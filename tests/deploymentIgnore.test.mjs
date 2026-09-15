import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

test('deployment excludes root SQLite files while retaining the data management route', () => {
  const directory = mkdtempSync(join(tmpdir(), 'survey-ignore-'));
  try {
    execFileSync('git', ['init', '--quiet', directory]);
    writeFileSync(join(directory, '.gitignore'), readFileSync(new URL('../.vercelignore', import.meta.url)));
    for (const [path, ignored] of [['data/survey.db', true], ['data/survey.db-wal', true], ['src/app/admin/data/page.js', false], ['src/app/api/participants/route.js', false], ['.env.local', true]]) {
      const result = spawnSync('git', ['-c', 'core.excludesFile=/dev/null', 'check-ignore', '--no-index', '--quiet', path], { cwd: directory });
      assert.equal(result.status, ignored ? 0 : 1, path);
    }
  } finally { rmSync(directory, {recursive: true, force: true}); }
});
