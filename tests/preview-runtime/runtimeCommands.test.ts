import { describe, expect, test } from 'vitest';
import {
  assertCleanupCommandSucceeded,
  BoundedDiagnostics,
  packageManagerProcessSpec,
  packageManagerVerificationLevel
} from '../../packages/preview-runtime/src/processRuntime';
import { discoverRuntimeCommands, withViteArguments } from '../../packages/preview-runtime/src/runtimeCommands';

function metadata(packageManager: 'npm' | 'pnpm' | 'yarn' | 'unknown', scripts: Record<string, string> = { dev: 'vite' }) {
  return {
    packageManager: { name: packageManager, evidence: `${packageManager} test metadata`, lockFiles: [] },
    scripts
  };
}

describe('preview runtime command discovery', () => {
  test('resolves npm install and declared dev commands', () => {
    expect(discoverRuntimeCommands(metadata('npm'))).toMatchObject({
      packageManager: 'npm',
      installCommand: 'npm install',
      devCommand: 'npm run dev',
      install: { executable: 'npm', args: ['install'] },
      dev: { executable: 'npm', args: ['run', 'dev'] }
    });
  });

  test('resolves pnpm install and declared dev commands', () => {
    expect(discoverRuntimeCommands(metadata('pnpm'))).toMatchObject({
      packageManager: 'pnpm',
      installCommand: 'pnpm install',
      devCommand: 'pnpm run dev'
    });
  });

  test('resolves yarn install and declared dev commands', () => {
    expect(discoverRuntimeCommands(metadata('yarn'))).toMatchObject({
      packageManager: 'yarn',
      installCommand: 'yarn install',
      devCommand: 'yarn run dev'
    });
  });

  test('refuses a missing dev script with a launch-ready explanation', () => {
    expect(() => discoverRuntimeCommands(metadata('npm', { build: 'vite build' }))).toThrow(
      'Preview failed\n\nCommand:\nnpm run dev\n\nReason:\nmissing script'
    );
  });

  test('refuses an unsupported package manager with discovery evidence', () => {
    expect(() => discoverRuntimeCommands(metadata('unknown'))).toThrow(/unsupported package manager.*unknown test metadata/);
  });

  test('preserves a spaced Vite config path as one Windows argv element without a shell', () => {
    const commands = discoverRuntimeCommands(metadata('npm'));
    const config = 'C:\\Users\\rekha\\OneDrive\\Documents\\UI merge studio\\apps\\studio\\preview.vite.config.ts';
    const invocation = withViteArguments(commands, ['--config', config, '--host', '127.0.0.1']);
    expect(packageManagerProcessSpec(invocation, 'win32', {
      nodeExecutable: 'C:\\Program Files\\nodejs\\node.exe',
      npmCli: 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js',
      corepackCli: 'C:\\Program Files\\nodejs\\node_modules\\corepack\\dist\\corepack.js'
    })).toEqual({
      executable: 'C:\\Program Files\\nodejs\\node.exe',
      args: [
        'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js',
        'run', 'dev', '--', '--config', config, '--host', '127.0.0.1'
      ]
    });
  });

  test('launches pnpm and yarn through Corepack with exact Windows argv', () => {
    const paths = { nodeExecutable: 'node.exe', npmCli: 'npm-cli.js', corepackCli: 'corepack.js' };
    expect(packageManagerProcessSpec({ executable: 'pnpm', args: ['run', 'dev', '--', '--strictPort'] }, 'win32', paths))
      .toEqual({ executable: 'node.exe', args: ['corepack.js', 'pnpm', 'run', 'dev', '--', '--strictPort'] });
    expect(packageManagerProcessSpec({ executable: 'yarn', args: ['run', 'dev', '--strictPort'] }, 'win32', paths))
      .toEqual({ executable: 'node.exe', args: ['corepack.js', 'yarn', 'run', 'dev', '--strictPort'] });
  });

  test('bounds retained process diagnostics to the most recent bytes', () => {
    const diagnostics = new BoundedDiagnostics(8);
    diagnostics.append('123456');
    diagnostics.append('abcdef');
    expect(diagnostics.byteLength).toBe(8);
    expect(diagnostics.toString()).toBe('56abcdef');
  });

  test('rejects failed cleanup commands and reports verification evidence honestly', () => {
    expect(() => assertCleanupCommandSucceeded('taskkill', 1, 'not found')).toThrow('taskkill failed (1): not found');
    expect(packageManagerVerificationLevel('npm')).toEqual({ commandResolution: 'verified', realExecution: 'verified', realViteLaunch: 'verified' });
    expect(packageManagerVerificationLevel('pnpm')).toEqual({ commandResolution: 'verified', realExecution: 'unverified', realViteLaunch: 'unverified' });
    expect(packageManagerVerificationLevel('yarn')).toEqual({ commandResolution: 'verified', realExecution: 'unverified', realViteLaunch: 'unverified' });
  });
});
