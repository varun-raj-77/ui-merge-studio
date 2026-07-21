import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { generated, git } from '../../scripts/fixture-lib';
import { verifyFixture } from '../../scripts/verify-phase0-fixture';

const cleanup: string[] = [];
afterEach(() => cleanup.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })));
function clone() { const path = mkdtempSync(resolve(tmpdir(), 'phase0-test-')); cleanup.push(path); execFileSync('git', ['clone', '--quiet', '--no-hardlinks', generated, path]); for (const branch of ['branch-sidebar', 'branch-inspector', 'branch-incompatible-route']) git(path, ['branch', branch, `origin/${branch}`]); return path; }
function expectReject(path: string, text: string) { expect(() => verifyFixture(path)).toThrow(text); }

test('generated fixture has required branches, ancestry, and verifies', () => { expect(git(generated, ['rev-list', '--count', 'main..branch-sidebar'])).toBe('1'); expect(git(generated, ['rev-list', '--count', 'main..branch-inspector'])).toBe('1'); expect(() => verifyFixture(generated)).not.toThrow(); });
test('rejects a dirty target', () => { const path = clone(); writeFileSync(resolve(path, 'dirty.txt'), 'dirty'); expectReject(path, 'working tree must be clean'); });
test('rejects a missing required branch', () => { const path = clone(); git(path, ['branch', '-D', 'branch-sidebar']); expectReject(path, 'missing branch'); });
test('rejects extra positive commits', () => { const path = clone(); git(path, ['checkout', 'branch-sidebar']); writeFileSync(resolve(path, 'extra.txt'), 'extra'); git(path, ['add', '.']); git(path, ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'Extra']); expectReject(path, 'exactly one commit'); });
test('rejects absent mixed heading evidence', () => { const path = clone(); git(path, ['checkout', 'branch-sidebar']); const file = resolve(path, 'src/features/tickets/TicketPage.tsx'); writeFileSync(file, readFileSync(file, 'utf8').replace('Operations Command Center', 'Support Tickets')); git(path, ['add', '.']); git(path, ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '--amend', '--no-edit']); expectReject(path, 'heading change'); });
test('rejects absent mixed sorting evidence', () => { const path = clone(); git(path, ['checkout', 'branch-inspector']); rmSync(resolve(path, 'src/utils/sortTickets.ts')); git(path, ['add', '-A']); git(path, ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '--amend', '--no-edit']); expectReject(path, 'sorting change'); });
test('rejects tags and a combined result', () => { const path = clone(); git(path, ['tag', 'sidebar-feature']); git(path, ['branch', 'combined-result']); expectReject(path, 'combined-result'); });
