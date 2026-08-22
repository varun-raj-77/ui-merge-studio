import type { PackageManagerName, RepositoryDiscovery } from '../../repository-controller/src/repositoryDiscovery';

export type SupportedPackageManager = Exclude<PackageManagerName, 'unknown'>;

export interface RuntimeCommandInvocation {
  executable: SupportedPackageManager;
  args: string[];
}

export interface PreviewRuntimeCommands {
  packageManager: SupportedPackageManager;
  installCommand: string;
  devCommand: string;
  install: RuntimeCommandInvocation;
  dev: RuntimeCommandInvocation;
}

export class PreviewRuntimeCommandError extends Error {
  constructor(readonly command: string, readonly reason: string) {
    super(`Preview failed\n\nCommand:\n${command}\n\nReason:\n${reason}`);
    this.name = 'PreviewRuntimeCommandError';
  }
}

type RuntimeMetadata = Pick<RepositoryDiscovery, 'packageManager' | 'scripts'>;

export function discoverRuntimeCommands(metadata: RuntimeMetadata): PreviewRuntimeCommands {
  const packageManager = metadata.packageManager.name;
  if (packageManager === 'unknown') {
    throw new PreviewRuntimeCommandError(
      '<unresolved package manager>',
      `unsupported package manager (${metadata.packageManager.evidence})`
    );
  }

  const devCommand = packageManager === 'yarn' ? 'yarn run dev' : `${packageManager} run dev`;
  if (typeof metadata.scripts.dev !== 'string' || metadata.scripts.dev.trim() === '') {
    throw new PreviewRuntimeCommandError(devCommand, 'missing script: package.json does not define a non-empty "dev" script');
  }

  return {
    packageManager,
    installCommand: `${packageManager} install`,
    devCommand,
    install: { executable: packageManager, args: ['install'] },
    dev: { executable: packageManager, args: ['run', 'dev'] }
  };
}

export function withViteArguments(commands: PreviewRuntimeCommands, args: string[]): RuntimeCommandInvocation {
  return {
    executable: commands.dev.executable,
    args: commands.packageManager === 'yarn'
      ? [...commands.dev.args, ...args]
      : [...commands.dev.args, '--', ...args]
  };
}
