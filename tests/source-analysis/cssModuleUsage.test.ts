import { describe, expect, test } from 'vitest';
import { inspectCssModuleUsage } from '../../packages/source-analysis/src/cssModuleUsage';

const path = 'src/features/revenue/RevenuePulseBadge.tsx';
const classes = ['label', 'pulse'];
const source = "import styles from './RevenuePulseBadge.module.css';\nexport function Badge(){return <section className={styles.pulse}><span className={styles.label}>Revenue</span></section>}\n";
const owner = (code: string) => ({ start: code.indexOf('function Badge'), end: code.length });

describe('UMS-24E strict CSS Module JSX class usage evidence', () => {
  test('accepts exact static JSX class references from one declaration, independent of line endings', () => {
    const expected = { status: 'supported', classes, reason: null };
    expect(inspectCssModuleUsage(source, path, owner(source), 'styles', classes)).toEqual(expected);
    const crlf = source.replace(/\n/g, '\r\n');
    expect(inspectCssModuleUsage(crlf, path, owner(crlf), 'styles', classes)).toEqual(expected);
  });

  test.each([
    ['dynamic class lookup', 'styles[variant]', ['pulse'], 'static styles.className'],
    ['computed literal lookup', "styles['pulse']", ['pulse'], 'static styles.className'],
    ['class name composition', "styles.pulse + ' extra'", ['pulse'], 'direct JSX className'],
    ['undefined class', 'styles.missing', ['pulse'], 'undefined local class'],
    ['unreferenced rule', 'styles.pulse', ['pulse', 'unrelated'], 'unreferenced local class'],
    ['non-class attribute', 'styles.pulse', ['pulse'], 'direct JSX className']
  ])('refuses %s', (label, expression, known, reason) => {
    const attribute = label === 'non-class attribute' ? 'data-kind' : 'className';
    const code = "import styles from './RevenuePulseBadge.module.css';\n"
      + 'export function Badge({variant}:{variant:string}){return <div ' + attribute + '={' + expression + '}/>}\n';
    expect(inspectCssModuleUsage(code, path, owner(code), 'styles', known))
      .toMatchObject({ status: 'refused', classes: [], reason: expect.stringContaining(reason) });
  });

  test('refuses use outside the selected declaration even when the CSS rule exists', () => {
    const code = source + 'export function Other(){return <p className={styles.pulse}/>};\n';
    expect(inspectCssModuleUsage(code, path, owner(source), 'styles', classes))
      .toMatchObject({ status: 'refused', classes: [], reason: expect.stringContaining('outside') });
  });
});
