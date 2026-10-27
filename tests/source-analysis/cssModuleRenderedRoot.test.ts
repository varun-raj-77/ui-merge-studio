import { describe, expect, test } from 'vitest';
import { inspectCssModuleRenderedRoot } from '../../packages/source-analysis/src/cssModuleRenderedRoot';

const sourcePath = 'src/features/revenue/RevenuePulseBadge.tsx';
const importLine = "import styles from './RevenuePulseBadge.module.css';";
const request = {
  sourcePath, componentName: 'RevenuePulseBadge', componentStartLine: 2,
  importSource: './RevenuePulseBadge.module.css', cssClasses: ['pulse'],
  selectedBoundary: { path: sourcePath, componentName: 'RevenuePulseBadge', line: 2, column: 8 }
};
const selectedSource = importLine + '\nexport function RevenuePulseBadge(){return <section className={styles.pulse}>Revenue pulse</section>}\n';

describe('UMS-24G: selected rendered-host CSS Module proof (no transfer)', () => {
  test('supports only a unique direct host root with all CSS classes within that root', () => {
    const first = inspectCssModuleRenderedRoot(selectedSource, request);
    expect(first).toEqual({ status: 'supported', classes: ['pulse'], reason: null });
    expect(inspectCssModuleRenderedRoot(selectedSource, request)).toEqual(first);
    expect(inspectCssModuleRenderedRoot(selectedSource.replace(/\n/g, '\r\n'), request)).toEqual(first);
    const nested = importLine + '\nexport function RevenuePulseBadge(){return <section className={styles.pulse}><span className={styles.label}>Up</span></section>}\n';
    expect(inspectCssModuleRenderedRoot(nested, { ...request, cssClasses: ['label', 'pulse'] })).toEqual({
      status: 'supported', classes: ['label', 'pulse'], reason: null
    });
  });

  test('accepts a direct host-return arrow function with attested variable declarator location', () => {
    const arrow = importLine + '\nexport const RevenuePulseBadge = () => <section className={styles.pulse}>Revenue pulse</section>;\n';
    expect(inspectCssModuleRenderedRoot(arrow, {
      ...request, selectedBoundary: { ...request.selectedBoundary, column: 14 }
    }).status).toBe('supported');
  });

  test.each([
    ['fragment root', importLine + '\nexport function RevenuePulseBadge(){return <><section className={styles.pulse}/></>}\n', 'one unconditional'],
    ['conditional alternate', importLine + '\nexport function RevenuePulseBadge({active}:{active:boolean}){return active ? <section className={styles.pulse}/> : <aside className={styles.pulse}/>}\n', 'one unconditional'],
    ['helper subtree', importLine + '\nexport function RevenuePulseBadge(){const extra = <aside className={styles.pulse}/>;return <section className={styles.pulse}/>}\n', 'one unconditional'],
    ['dynamic child', importLine + '\nexport function RevenuePulseBadge({active}:{active:boolean}){return <section className={styles.pulse}>{active && <span>Maybe</span>}</section>}\n', 'Dynamic'],
    ['spread overriding className', importLine + '\nexport function RevenuePulseBadge({props}:{props:object}){return <section className={styles.pulse} {...props}/>}\n', 'spreads'],
    ['dynamic event prop', importLine + '\nexport function RevenuePulseBadge(){return <section className={styles.pulse} onClick={() => {}}/>}\n', 'Dynamic'],
    ['custom component target', importLine + '\nexport function RevenuePulseBadge(){return <section><Other className={styles.pulse}/></section>}\n', 'custom component']
  ] as const)('refuses %s', (_label, source, reason) => {
    expect(inspectCssModuleRenderedRoot(source, request)).toMatchObject({
      status: 'refused', classes: [], reason: expect.stringContaining(reason)
    });
  });

  test('rejects nonselected owner identity and mismatch in the attested column', () => {
    expect(inspectCssModuleRenderedRoot(selectedSource, {
      ...request, selectedBoundary: { ...request.selectedBoundary, path: 'src/App.tsx' }
    })).toMatchObject({ status: 'refused', reason: expect.stringContaining('exact selected') });
    expect(inspectCssModuleRenderedRoot(selectedSource, {
      ...request, selectedBoundary: { ...request.selectedBoundary, column: 1 }
    })).toMatchObject({ status: 'refused', reason: expect.stringContaining('line and column') });
  });
});
