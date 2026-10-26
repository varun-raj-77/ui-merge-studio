import { describe, expect, test } from 'vitest';
import { inspectCssModuleSyntax } from '../../packages/source-analysis/src/cssModuleSyntax';

const path = 'src/features/revenue/RevenuePulseBadge.module.css';

describe('UMS-24D strict CSS Module syntax evidence', () => {
  test('recognizes only isolated simple local class rules and returns deterministic class identities', () => {
    const css = '/* feature-only */\n.pulse { display: flex; color: #00aa00; }\n.label { font-weight: 600; }\n';
    const first = inspectCssModuleSyntax(css, path);
    expect(first).toEqual({ status: 'supported', classes: ['label', 'pulse'], reason: null });
    expect(inspectCssModuleSyntax(css.replace(/\n/g, '\r\n'), path)).toEqual(first);
    expect(inspectCssModuleSyntax(css, path)).toEqual(first);
  });

  test.each([
    ['non-module path', '.pulse{color:red}', 'src/styles.css', 'explicit .module.css'],
    ['global selector', ':global(body){color:red}', path, 'simple local class'],
    ['combined selector', '.pulse,.other{color:red}', path, 'simple local class'],
    ['descendant selector', '.pulse .child{color:red}', path, 'simple local class'],
    ['pseudo selector', '.pulse:hover{color:red}', path, 'simple local class'],
    ['element selector', 'button{color:red}', path, 'simple local class'],
    ['import', '@import "./shared.css";', path, 'root at-rule'],
    ['keyframes', '@keyframes spin { from{opacity:0} to{opacity:1} }', path, 'root at-rule'],
    ['font face', '@font-face {font-family:External;src:url("./x.woff")}', path, 'root at-rule'],
    ['nested selector', '.pulse{& .child{color:red}}', path, 'nested'],
    ['composes', '.pulse{composes:shared from "./shared.module.css"}', path, 'property'],
    ['url reference', '.pulse{background-color:url("./asset.svg")}', path, 'value'],
    ['dynamic value', '.pulse{color:var(--brand-color)}', path, 'value'],
    ['important', '.pulse{color:red!important}', path, 'priority'],
    ['duplicate class', '.pulse{color:red}.pulse{display:flex}', path, 'repeats'],
    ['empty rule', '.pulse{}', path, 'no supported declarations'],
    ['empty file', '/* no rules */', path, 'no supported local class'],
    ['broken CSS', '.pulse{color:', path, 'not valid CSS']
  ])('refuses %s instead of accepting an unproven CSS effect', (_label, css, file, reason) => {
    const result = inspectCssModuleSyntax(css, file);
    expect(result).toMatchObject({ status: 'refused', classes: [], reason: expect.stringContaining(reason) });
  });

  test('refuses a stylesheet outside the bounded inspection budget', () => {
    const result = inspectCssModuleSyntax('.pulse{color:red}' + ' '.repeat(17_000), path);
    expect(result).toMatchObject({ status: 'refused', classes: [], reason: expect.stringContaining('16 KiB') });
  });
});
