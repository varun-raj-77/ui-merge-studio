import { symlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import react from '@vitejs/plugin-react';
import { build, preview } from 'vite';
import { CandidateGenerator } from '../../packages/candidate-generation/src/candidateGenerator';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import { cleanupRepositories, commit, createRepository, git, writeFiles } from '../source-analysis/testRepository';

test.afterEach(cleanupRepositories);

async function inspectProductionBuild(root: string, page: Page) {
  await build({ root, configFile: false, plugins: [react()], logLevel: 'error', build: { outDir: 'dist' } });
  const server = await preview({ root, configFile: false, logLevel: 'error', preview: { host: '127.0.0.1', port: 0 } });
  try {
    const address = server.httpServer.address();
    if (!address || typeof address === 'string') throw new Error('Vite preview did not bind a TCP port.');
    await page.goto(`http://127.0.0.1:${address.port}/`);
    await expect(page.locator('#unrelated')).toHaveText('Unrelated sibling');
    const sibling = await page.locator('#unrelated').boundingBox();
    if (!sibling) throw new Error('Unrelated sibling has no layout box.');
    return sibling.x;
  } finally {
    await new Promise<void>((done, reject) => server.httpServer.close(error => error ? reject(error) : done()));
  }
}

test('UMS-25A: a real phase0 Git candidate compiles its CSS Module, which shifts an untouched sibling', async ({ page }) => {
  test.setTimeout(180_000);
  const root = createRepository({
    '.gitignore': 'node_modules\ndist\n',
    'package.json': '{"private":true,"type":"module","scripts":{"build":"vite build"}}\n',
    'index.html': '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n',
    'src/main.tsx': "import { createRoot } from 'react-dom/client';\nimport { App } from './App';\ncreateRoot(document.getElementById('root')!).render(<App/>);\n",
    'src/App.tsx': 'export function App(){return <main style={{display:"flex",width:700}}><aside id="unrelated">Unrelated sibling</aside></main>}\n'
  });
  // The disposable Git fixture uses the checked-in project's already installed
  // dependencies; node_modules and Vite output remain ignored and uncommitted.
  symlinkSync(resolve(process.cwd(), 'node_modules'), resolve(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const baseCommit = git(root, ['rev-parse', 'main']);
  const baselineX = await inspectProductionBuild(root, page);

  git(root, ['switch', '-c', 'feature']);
  writeFiles(root, {
    'src/App.tsx': "import { Feature } from './features/Feature';\nexport function App(){return <main style={{display:'flex',width:700}}><Feature/><aside id='unrelated'>Unrelated sibling</aside></main>}\n",
    'src/features/Feature.tsx': "import styles from './Feature.module.css';\nexport function Feature(){return <section id='selected' className={styles.pulse}>Selected feature</section>}\n",
    'src/features/Feature.module.css': '.pulse{width:320px}\n',
    'src/AccidentalPromotion.tsx': 'export function AccidentalPromotion(){return <p>Unselected promotional change</p>}\n'
  });
  const featureCommit = commit(root, 'feat: selected CSS Module plus unrelated experiment');
  const artifact = await new FeatureSliceAnalyzer(root).analyze({
    baseRef: 'main', branchRef: 'feature', expectedBranchCommit: featureCommit,
    selection: {
      boundaryId: 'feature-boundary', instanceId: 'feature-instance',
      repositoryRelativePath: 'src/features/Feature.tsx', line: 2, column: 8,
      componentName: 'Feature', exportName: 'Feature', branch: 'feature',
      previewId: 'css-candidate-test', sessionId: 'css-candidate-test-session',
      generation: 1, confidence: 'exact'
    }
  });
  expect(artifact.slice.status, JSON.stringify(artifact.slice.unresolvedDependencies)).toBe('resolved');
  const generator = new CandidateGenerator(root, {
    artifactRoot: resolve(process.cwd()),
    verificationCommands: [{ name: 'isolated-generation', executable: process.execPath, args: ['-e', 'process.exit(0)'] }]
  });
  const request = {
    repositoryRoot: root, baseRef: 'main', expectedBaseCommit: baseCommit,
    candidateBranch: 'combined-result', artifacts: [artifact],
    analyzerSchemaVersion: 2 as const, generationProfile: 'phase0' as const
  };
  const preflight = await generator.preflight(request);
  expect(preflight.plan.status, JSON.stringify(preflight.plan.unresolved)).toBe('ready');
  expect(preflight.plan.operations).toContainEqual(expect.objectContaining({
    kind: 'add-style-file', target: expect.objectContaining({ path: 'src/features/Feature.module.css' })
  }));
  const generated = await generator.generate(request);
  expect(generated.status, generated.message).toBe('succeeded');
  expect(git(root, ['diff', '--name-only', 'main..combined-result']).split(/\r?\n/)).toEqual([
    'src/App.tsx', 'src/features/Feature.module.css', 'src/features/Feature.tsx'
  ]);
  expect(git(root, ['rev-parse', 'feature'])).toBe(featureCommit);
  expect(() => git(root, ['grep', '-n', 'Unselected promotional change', 'combined-result'])).toThrow();
  git(root, ['switch', 'combined-result']);

  // This is the Vite-built Git candidate, not an injected style tag or a
  // simulated CSS Modules hash. The external-react-vite profile remains closed.
  await build({ root, configFile: false, plugins: [react()], logLevel: 'error', build: { outDir: 'dist' } });
  const server = await preview({ root, configFile: false, logLevel: 'error', preview: { host: '127.0.0.1', port: 0 } });
  try {
    const address = server.httpServer.address();
    if (!address || typeof address === 'string') throw new Error('Candidate Vite preview did not bind a TCP port.');
    await page.goto(`http://127.0.0.1:${address.port}/`);
    const selected = page.locator('#selected');
    await expect(selected).toHaveText('Selected feature');
    const compiledClass = await selected.getAttribute('class');
    expect(compiledClass).toBeTruthy();
    expect(compiledClass).not.toBe('pulse');
    const styledWidth = await selected.evaluate(element => element.getBoundingClientRect().width);
    expect(styledWidth).toBeCloseTo(320, 0);
    const stylesheet = page.locator('link[rel="stylesheet"]');
    expect(await stylesheet.count()).toBeGreaterThan(0);
    const sibling = page.locator('#unrelated');
    const styled = await sibling.boundingBox();
    if (!styled) throw new Error('Missing candidate sibling layout box.');
    expect(styled.x - baselineX).toBeGreaterThan(250);

    // Disable the compiled stylesheet without changing the selected or
    // unrelated DOM. The resulting geometry isolates the CSS effect.
    await stylesheet.evaluateAll(links => links.forEach(link => { (link as HTMLLinkElement).disabled = true; }));
    const unstyled = await sibling.boundingBox();
    if (!unstyled) throw new Error('Missing unstyled sibling layout box.');
    expect(styled.x - unstyled.x).toBeGreaterThan(120);
    await expect(sibling).toHaveText('Unrelated sibling');
    expect(await sibling.getAttribute('class')).toBeNull();
  } finally {
    await new Promise<void>((done, reject) => server.httpServer.close(error => error ? reject(error) : done()));
  }
});
