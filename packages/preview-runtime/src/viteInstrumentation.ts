import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import type { RepositoryDiscovery } from '../../repository-controller/src/repositoryDiscovery';
import type { PreviewCapabilities, PreviewIdentity } from '../../shared/src/bridge';
import { PreviewRuntimeCommandError } from './runtimeCommands';

export const externalViteInstrumentationRefusalCode = 'unsupported-vite-instrumentation' as const;

export class ExternalViteInstrumentationRefusal extends PreviewRuntimeCommandError {
  readonly code = externalViteInstrumentationRefusalCode;

  constructor(readonly evidence: string) {
    super('<compose native Vite configuration>', `External Vite instrumentation is unsupported: ${evidence}`);
    this.name = 'ExternalViteInstrumentationRefusal';
  }
}

type ExternalViteMetadata = Pick<RepositoryDiscovery, 'scripts' | 'framework'>;

export function nativeViteConfigPath(repositoryRoot: string, metadata: ExternalViteMetadata) {
  const configFiles = metadata.framework.vite.configFiles;
  if (configFiles.length > 1) {
    throw new ExternalViteInstrumentationRefusal(`multiple Vite configuration files were discovered (${configFiles.join(', ')}), so Studio cannot choose one without changing repository semantics.`);
  }
  const configFile = configFiles[0] ?? null;
  if (configFile?.includes('/')) {
    throw new ExternalViteInstrumentationRefusal(`the discovered Vite configuration is nested (${configFile}); nested or monorepo configuration roots are not supported.`);
  }
  const devScript = metadata.scripts.dev ?? '';
  if (/(?:^|\s)(?:-c(?:\s|=)|--config(?:\s|=)|--configLoader(?:\s|=))/.test(devScript)) {
    throw new ExternalViteInstrumentationRefusal('the dev script selects a Vite config or config loader; Studio will not override that choice implicitly.');
  }
  return configFile ? resolve(repositoryRoot, configFile) : null;
}

export async function writeExternalViteInstrumentationConfig(options: {
  repositoryRoot: string;
  metadata: ExternalViteMetadata;
  identity: PreviewIdentity;
  studioOrigin: string;
  capabilities: PreviewCapabilities;
}) {
  const nativeConfigPath = nativeViteConfigPath(options.repositoryRoot, options.metadata);
  const wrapperPath = resolve(options.repositoryRoot, '.ums', 'ui-merge.preview.vite.config.ts');
  const instrumentationPath = resolve(import.meta.dirname, '../../source-instrumentation/src/vitePlugin.ts');
  const relativeInstrumentationPath = relative(dirname(wrapperPath), instrumentationPath).split(sep).join('/');
  const instrumentationModule = relativeInstrumentationPath.startsWith('.') ? relativeInstrumentationPath : `./${relativeInstrumentationPath}`;
  const source = `import { loadConfigFromFile } from 'vite';
import { reactSourceInstrumentation } from ${JSON.stringify(instrumentationModule)};

const repositoryRoot = ${JSON.stringify(options.repositoryRoot)};
const nativeConfigPath = ${JSON.stringify(nativeConfigPath)};
const instrumentation = reactSourceInstrumentation(${JSON.stringify({
    repositoryRoot: options.repositoryRoot,
    branch: options.identity.branch,
    studioOrigin: options.studioOrigin,
    identity: options.identity,
    capabilities: options.capabilities
  })});

export default async function uiMergeExternalViteConfig(configEnv) {
  const loaded = nativeConfigPath ? await loadConfigFromFile(configEnv, nativeConfigPath, repositoryRoot) : null;
  if (nativeConfigPath && !loaded) throw new Error('UI Merge Studio could not load the repository native Vite configuration.');
  const nativeConfig = loaded?.config ?? {};
  return { ...nativeConfig, root: nativeConfig.root ?? repositoryRoot, plugins: [instrumentation, ...(nativeConfig.plugins ?? [])] };
}
`;
  await mkdir(dirname(wrapperPath), { recursive: true });
  await writeFile(wrapperPath, source, 'utf8');
  return { wrapperPath, nativeConfigPath };
}
