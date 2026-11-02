import { describe, expect, test } from 'vitest';
import { inspectCssModuleClassUsage } from '../../packages/source-analysis/src/cssModuleClassUsage';

const request = {
  sourcePath: 'src/features/revenue/RevenuePulseBadge.tsx',
  componentName: 'RevenuePulseBadge',
  componentStartLine: 2,
  importSource: './RevenuePulseBadge.module.css',
  cssClasses: ['pulse']
};
const staticSource = "import styles from './RevenuePulseBadge.module.css';\nexport function RevenuePulseBadge(){return <section className={styles.pulse}>Revenue pulse</section>}\n";

describe('UMS-24E CSS Module declaration-wide class reference evidence', () => {
  test('records one exact static class, regardless of line ending style and repeated runs', () => {
    const first = inspectCssModuleClassUsage(staticSource, request);
    expect(first).toEqual({ status: 'supported', classes: ['pulse'], reason: null });
    expect(inspectCssModuleClassUsage(staticSource.replace(/\n/g, '\r\n'), request)).toEqual(first);
    expect(inspectCssModuleClassUsage(staticSource, request)).toEqual(first);
  });

  test.each([
    ['unused unrelated rule', staticSource, ['pulse', 'unrelated'], 'not referenced'],
    ['unknown referenced class', staticSource, ['other'], 'absent'],
    ['dynamic member', staticSource.replace('styles.pulse', 'styles[key]'), ['pulse'], 'dynamic'],
    ['computed literal', staticSource.replace('styles.pulse', "styles['pulse']"), ['pulse'], 'dynamic'],
    ['aliased binding', staticSource.replace('return <section', 'const alias = styles; return <section').replace('styles.pulse', 'alias.pulse'), ['pulse'], 'unsupported'],
    ['non-className expression', staticSource.replace('className={styles.pulse}', 'title={styles.pulse}'), ['pulse'], 'not a direct static'],
    ['missing reference', staticSource.replace('className={styles.pulse}', 'className="pulse"'), ['pulse'], 'no direct static'],
    ['binding outside selected declaration', staticSource + 'export const copied = styles.pulse;\n', ['pulse'], 'outside the selected'],
    ['unrelated component uses the same binding', staticSource + 'export function Unrelated(){return <div className={styles.pulse}/>};\n', ['pulse'], 'outside the selected'],
    ['missing component identity', staticSource, ['pulse'], 'absent or ambiguous']
  ] as const)('refuses %s', (label, source, cssClasses, reason) => {
    const input = { ...request, cssClasses, ...(label === 'missing component identity' ? { componentName: 'Other' } : {}) };
    expect(inspectCssModuleClassUsage(source, input)).toMatchObject({
      status: 'refused', classes: [], reason: expect.stringContaining(reason)
    });
  });

  test('refuses a shadowed binding even when its name matches the import alias', () => {
    const source = "import styles from './RevenuePulseBadge.module.css';\nexport function RevenuePulseBadge(){const render = (styles: {pulse: string}) => <div className={styles.pulse}/>; return render({pulse:'x'})}\n";
    expect(inspectCssModuleClassUsage(source, request)).toMatchObject({
      status: 'refused', reason: expect.stringContaining('shadowed')
    });
  });

  test('refuses malformed TSX and non-TSX paths', () => {
    expect(inspectCssModuleClassUsage("export function Broken(){return <div", request).status).toBe('refused');
    expect(inspectCssModuleClassUsage(staticSource, { ...request, sourcePath: 'src/Feature.js' }).status).toBe('refused');
  });
});
