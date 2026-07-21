import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { branches, generated, git, run } from './fixture-lib';
if (!existsSync(resolve(generated, '.git'))) throw new Error('Run npm run fixture:create first.');
const mode = process.argv[2] ?? 'build-all';
for (const branch of branches) {
  const dir = mkdtempSync(resolve(tmpdir(), `phase0-${branch}-`));
  try {
    git(dir, ['clone', '--quiet', '--no-hardlinks', generated, '.']);
    git(dir, ['checkout', '--quiet', branch]);
    console.log(`\n=== ${branch} ===`);
    run(dir, 'npm', ['ci']);
    run(dir, 'npm', ['run', 'typecheck']);
    run(dir, 'npm', ['test']);
    if (mode === 'build-all') { run(dir, 'npm', ['run', 'build']); run(dir, 'npm', ['run', 'test:e2e']); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
