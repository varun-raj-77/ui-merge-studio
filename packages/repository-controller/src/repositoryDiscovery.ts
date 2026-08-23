import { execFile } from 'node:child_process';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, posix, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const supportedPackageManagers = ['npm', 'pnpm', 'yarn'] as const;
const ignoredSourceRoots = new Set(['.git', '.ums', 'build', 'coverage', 'dist', 'node_modules']);

export type PackageManagerName = typeof supportedPackageManagers[number] | 'unknown';

export interface PackageManagerDiscovery {
  name: PackageManagerName;
  evidence: string;
  lockFiles: string[];
}

export interface FrameworkDiscovery {
  kind: 'react-typescript-vite';
  react: { detected: true; version: string; evidence: string[] };
  typescript: { detected: true; version: string; configFiles: string[]; evidence: string[] };
  vite: { detected: true; version: string; configFiles: string[]; evidence: string[] };
}

export interface RepositoryDiscovery {
  repositoryPath: string;
  git: { detected: true; root: string };
  packageJsonPath: string;
  packageName: string | null;
  packageManager: PackageManagerDiscovery;
  entryPoints: string[];
  sourceDirectories: string[];
  scripts: Record<string, string>;
  dependencies: {
    production: Record<string, string>;
    development: Record<string, string>;
    peer: Record<string, string>;
    all: Record<string, string>;
  };
  framework: FrameworkDiscovery;
}

export type RepositoryDiscoveryErrorCode =
  | 'invalid-path'
  | 'not-directory'
  | 'not-git'
  | 'not-repository-root'
  | 'missing-package-json'
  | 'invalid-package-json'
  | 'unsupported-repository';

export class RepositoryDiscoveryError extends Error {
  constructor(
    readonly code: RepositoryDiscoveryErrorCode,
    message: string,
    readonly detected: string[],
    readonly missing: string[]
  ) {
    super(message);
    this.name = 'RepositoryDiscoveryError';
  }
}

type PackageJson = {
  name?: unknown;
  packageManager?: unknown;
  scripts?: unknown;
  dependencies?: unknown;
  devDependencies?: unknown;
  peerDependencies?: unknown;
};

function compare(left: string, right: string) { return left.localeCompare(right, 'en'); }
function slash(path: string) { return path.replaceAll('\\', '/'); }
function sortedUnique(values: Iterable<string>) { return [...new Set(values)].sort(compare); }
function sortedRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string').sort(([left], [right]) => compare(left, right)));
}

function refusal(code: RepositoryDiscoveryErrorCode, repositoryPath: string, detected: string[], missing: string[]) {
  const detectedText = detected.length ? detected.join('; ') : 'nothing could be inspected';
  const missingText = missing.join('; ');
  return new RepositoryDiscoveryError(
    code,
    `UI Merge Studio cannot continue with ${repositoryPath}. Detected: ${detectedText}. Missing or unsupported: ${missingText}. UI Merge Studio currently requires a local Git repository root containing a React + TypeScript + Vite application.`,
    detected,
    missing
  );
}

async function git(cwd: string, args: string[]) {
  return (await execFileAsync('git', args, { cwd, encoding: 'utf8' })).stdout.trim();
}

async function repositoryFiles(repositoryPath: string) {
  const output = await git(repositoryPath, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']);
  return sortedUnique(output.split('\0').filter(Boolean).map(slash).filter(path => !ignoredSourceRoots.has(path.split('/')[0])));
}

function version(dependencies: Record<string, string>, name: string) { return dependencies[name] ?? 'version not declared'; }

function discoverPackageManager(manifest: PackageJson, files: string[]): PackageManagerDiscovery {
  const lockFileManagers = new Map<string, typeof supportedPackageManagers[number]>([
    ['package-lock.json', 'npm'],
    ['npm-shrinkwrap.json', 'npm'],
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn']
  ]);
  const lockFiles = files.filter(path => lockFileManagers.has(path));
  if (typeof manifest.packageManager === 'string') {
    const name = manifest.packageManager.split('@')[0];
    if ((supportedPackageManagers as readonly string[]).includes(name)) return { name: name as PackageManagerName, evidence: `package.json packageManager=${manifest.packageManager}`, lockFiles };
  }
  const managers = sortedUnique(lockFiles.map(path => lockFileManagers.get(path)!));
  if (managers.length === 1) return { name: managers[0] as PackageManagerName, evidence: `${lockFiles.join(', ')} lockfile`, lockFiles };
  if (managers.length > 1) return { name: 'unknown', evidence: `conflicting lockfiles: ${lockFiles.join(', ')}`, lockFiles };
  return { name: 'unknown', evidence: 'no packageManager field or supported lockfile', lockFiles: [] };
}

function moduleScriptSources(html: string) {
  const sources: string[] = [];
  for (const tag of html.matchAll(/<script\b([^>]*)>/gi)) {
    const attributes = tag[1];
    const type = attributes.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1];
    const source = attributes.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (type === 'module' && source && !/^(?:[a-z]+:)?\/\//i.test(source)) sources.push(source.split(/[?#]/)[0]);
  }
  return sources;
}

function sourceDirectory(entryPoint: string) {
  const directory = posix.dirname(entryPoint);
  if (directory === '.') return '.';
  return directory.split('/')[0];
}

async function discoverEntries(repositoryPath: string, files: string[]) {
  const fileSet = new Set(files);
  const entryPoints: string[] = [];
  for (const htmlPath of files.filter(path => path.endsWith('.html'))) {
    const html = await readFile(resolve(repositoryPath, htmlPath), 'utf8');
    for (const source of moduleScriptSources(html)) {
      const candidate = posix.normalize(source.startsWith('/') ? source.slice(1) : posix.join(posix.dirname(htmlPath), source));
      if (!candidate.startsWith('../') && fileSet.has(candidate)) entryPoints.push(candidate);
    }
  }
  if (!entryPoints.length) {
    const sourceFiles = files.filter(path => /\.[jt]sx?$/.test(path) && !path.endsWith('.d.ts'));
    for (const path of sourceFiles) {
      const source = await readFile(resolve(repositoryPath, path), 'utf8');
      if (/\bcreateRoot\s*\(/.test(source) || /\bReactDOM\.render\s*\(/.test(source)) entryPoints.push(path);
    }
  }
  const entries = sortedUnique(entryPoints);
  return { entryPoints: entries, sourceDirectories: sortedUnique(entries.map(sourceDirectory)) };
}

function usesVite(scripts: Record<string, string>) {
  return Object.values(scripts).some(script => /(^|[\s;&|])vite(?=$|\s)/.test(script));
}

export async function discoverRepository(inputPath: string): Promise<RepositoryDiscovery> {
  const repositoryPath = resolve(inputPath);
  let pathStat;
  try { pathStat = await stat(repositoryPath); }
  catch { throw refusal('invalid-path', repositoryPath, ['the supplied path does not exist or is inaccessible'], ['an accessible local directory']); }
  if (!pathStat.isDirectory()) throw refusal('not-directory', repositoryPath, ['the supplied path is not a directory'], ['a repository directory']);

  let canonicalPath: string;
  try { canonicalPath = await realpath(repositoryPath); }
  catch { throw refusal('invalid-path', repositoryPath, ['the supplied directory could not be resolved'], ['an accessible local directory']); }

  let gitRoot: string;
  try { gitRoot = await realpath(await git(canonicalPath, ['rev-parse', '--show-toplevel'])); }
  catch { throw refusal('not-git', canonicalPath, ['an accessible directory', 'no Git work tree'], ['a Git repository']); }
  if (slash(gitRoot).toLowerCase() !== slash(canonicalPath).toLowerCase()) {
    throw refusal('not-repository-root', canonicalPath, [`Git repository root ${gitRoot}`], ['the repository root path rather than a nested directory']);
  }

  const detected = ['Git repository'];
  const packageJsonPath = resolve(canonicalPath, 'package.json');
  let manifestText: string;
  try { manifestText = await readFile(packageJsonPath, 'utf8'); }
  catch { throw refusal('missing-package-json', canonicalPath, detected, ['package.json at the repository root']); }
  detected.push('package.json');

  let manifest: PackageJson;
  try {
    const parsed = JSON.parse(manifestText) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('package.json must contain an object.');
    manifest = parsed as PackageJson;
  }
  catch { throw refusal('invalid-package-json', canonicalPath, detected, ['valid JSON in package.json']); }

  const files = await repositoryFiles(canonicalPath);
  const scripts = sortedRecord(manifest.scripts);
  const production = sortedRecord(manifest.dependencies);
  const development = sortedRecord(manifest.devDependencies);
  const peer = sortedRecord(manifest.peerDependencies);
  const all = { ...peer, ...development, ...production };
  const tsconfigFiles = files.filter(path => /(^|\/)tsconfig(?:\.[^/]+)?\.json$/.test(path)).sort(compare);
  const viteConfigFiles = files.filter(path => /(^|\/)vite\.config\.[cm]?[jt]s$/.test(path)).sort(compare);
  const typescriptSources = files.filter(path => /\.tsx?$/.test(path) && !path.endsWith('.d.ts'));
  const { entryPoints, sourceDirectories } = await discoverEntries(canonicalPath, files);

  const reactDetected = typeof all.react === 'string';
  const typescriptDependencyDetected = typeof all.typescript === 'string';
  const typescriptDetected = typescriptDependencyDetected && tsconfigFiles.length > 0 && typescriptSources.length > 0;
  const viteDependencyDetected = typeof all.vite === 'string';
  const viteRuntimeDetected = viteConfigFiles.length > 0 || usesVite(scripts);
  const viteDetected = viteDependencyDetected && viteRuntimeDetected;
  if (reactDetected) detected.push(`React ${version(all, 'react')}`);
  if (typescriptDependencyDetected) detected.push(`TypeScript dependency ${version(all, 'typescript')}`);
  if (tsconfigFiles.length) detected.push(`TypeScript configuration ${tsconfigFiles.join(', ')}`);
  if (typescriptSources.length) detected.push(`${typescriptSources.length} TypeScript source file${typescriptSources.length === 1 ? '' : 's'}`);
  if (viteDependencyDetected) detected.push(`Vite dependency ${version(all, 'vite')}`);
  if (viteRuntimeDetected) detected.push(viteConfigFiles.length ? `Vite configuration ${viteConfigFiles.join(', ')}` : 'a Vite package script');
  if (entryPoints.length) detected.push(`application entry point${entryPoints.length === 1 ? '' : 's'} ${entryPoints.join(', ')}`);

  const missing: string[] = [];
  if (!reactDetected) missing.push('the react package dependency');
  if (!typescriptDependencyDetected) missing.push('the typescript package dependency');
  if (!tsconfigFiles.length) missing.push('a tsconfig.json or tsconfig.*.json configuration');
  if (!typescriptSources.length) missing.push('TypeScript application source (.ts or .tsx)');
  if (!viteDependencyDetected) missing.push('the vite package dependency');
  if (!viteRuntimeDetected) missing.push('a Vite configuration or package script');
  if (!entryPoints.length) missing.push('a static Vite module entry point or React DOM bootstrap');
  if (!reactDetected || !typescriptDetected || !viteDetected || !entryPoints.length) throw refusal('unsupported-repository', canonicalPath, detected, missing);

  return {
    repositoryPath: canonicalPath,
    git: { detected: true, root: gitRoot },
    packageJsonPath,
    packageName: typeof manifest.name === 'string' ? manifest.name : null,
    packageManager: discoverPackageManager(manifest, files),
    entryPoints,
    sourceDirectories,
    scripts,
    dependencies: { production, development, peer, all: sortedRecord(all) },
    framework: {
      kind: 'react-typescript-vite',
      react: { detected: true, version: version(all, 'react'), evidence: ['package.json dependency react'] },
      typescript: { detected: true, version: version(all, 'typescript'), configFiles: tsconfigFiles, evidence: ['package.json dependency typescript', ...tsconfigFiles, `${typescriptSources.length} TypeScript source file${typescriptSources.length === 1 ? '' : 's'}`] },
      vite: { detected: true, version: version(all, 'vite'), configFiles: viteConfigFiles, evidence: ['package.json dependency vite', ...(viteConfigFiles.length ? viteConfigFiles : ['package.json Vite script'])] }
    }
  };
}
