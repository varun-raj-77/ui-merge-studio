import { test, expect } from '@playwright/test';
import { inspectCssModuleSyntax } from '../../packages/source-analysis/src/cssModuleSyntax';
import { inspectCssModuleRenderedRoot } from '../../packages/source-analysis/src/cssModuleRenderedRoot';

test('UMS-24J: static CSS Module ownership does not prove unrelated layout invariance', async ({ page }) => {
  const css = '.pulse{width:260px}';
  const syntax = inspectCssModuleSyntax(css, 'src/Feature.module.css');
  expect(syntax).toEqual({ status: 'supported', classes: ['pulse'], reason: null });

  const source = "import styles from './Feature.module.css';\n"
    + 'export function Feature(){return <section className={styles.pulse}>Selected feature</section>}\n';
  const rendered = inspectCssModuleRenderedRoot(source, {
    sourcePath: 'src/Feature.tsx',
    componentName: 'Feature',
    componentStartLine: 2,
    importSource: './Feature.module.css',
    cssClasses: syntax.classes,
    selectedBoundary: { path: 'src/Feature.tsx', componentName: 'Feature', line: 2, column: 8 }
  });
  expect(rendered).toEqual({ status: 'supported', classes: ['pulse'], reason: null });

  // Controlled DOM/CSS counterexample, not a Vite-compiled CSS Module or
  // a real candidate-generation success. The hashed class models local scope.
  await page.setViewportSize({ width: 1000, height: 640 });
  await page.setContent([
    '<div style="display:flex;gap:0;width:700px">',
    '  <section id="selected" class="feature_pulse__hash">Selected feature</section>',
    '  <aside id="unrelated">Untouched sibling</aside>',
    '</div>'
  ].join(''));
  const sibling = page.locator('#unrelated');
  const baseline = await sibling.boundingBox();
  if (!baseline) throw new Error('Missing baseline sibling layout box.');

  // Negative control: a scoped rule that matches no rendered element has no effect.
  await page.addStyleTag({ content: '.other_unused__hash{width:260px}' });
  const control = await sibling.boundingBox();
  if (!control) throw new Error('Missing negative-control sibling layout box.');
  expect(control.x).toBeCloseTo(baseline.x, 1);

  // Model the CSS Module's local class as a hashed class name. Changing only
  // that one feature's width moves a separate sibling despite unchanged DOM.
  await page.addStyleTag({ content: '.feature_pulse__hash{width:260px}' });
  const after = await sibling.boundingBox();
  if (!after) throw new Error('Missing styled sibling layout box.');
  expect(after.x - baseline.x).toBeGreaterThan(120);
  expect(await sibling.textContent()).toBe('Untouched sibling');
  expect(await sibling.getAttribute('class')).toBeNull();
});
