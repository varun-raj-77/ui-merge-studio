import postcss from 'postcss';

export interface CssModuleSyntaxEvidence {
  status: 'supported' | 'refused';
  classes: string[];
  reason: string | null;
}

const maxBytes = 16 * 1024;
const classSelector = /^\.([A-Za-z_][A-Za-z0-9_-]*)$/;
const plainValue = /^[A-Za-z0-9#.%+\-\s,]+$/;
const localProperties = new Set([
  'align-items', 'background-color', 'border', 'border-color', 'border-radius',
  'border-style', 'border-width', 'color', 'display', 'flex', 'flex-direction',
  'flex-wrap', 'font-size', 'font-weight', 'gap', 'height', 'justify-content',
  'letter-spacing', 'line-height', 'margin', 'margin-bottom', 'margin-left',
  'margin-right', 'margin-top', 'max-height', 'max-width', 'min-height',
  'min-width', 'opacity', 'overflow', 'padding', 'padding-bottom',
  'padding-left', 'padding-right', 'padding-top', 'text-align', 'white-space',
  'width'
]);

function refused(reason: string): CssModuleSyntaxEvidence {
  return { status: 'refused', classes: [], reason };
}

/**
 * Strict syntax evidence only. A supported result does NOT prove that this
 * CSS Module has exclusive importer/declaration ownership, static JSX class
 * usage, or permission to enter the external candidate transform grammar.
 */
export function inspectCssModuleSyntax(css: string, path: string): CssModuleSyntaxEvidence {
  if (!path.endsWith('.module.css')) return refused('Only an explicit .module.css source is eligible for syntax inspection.');
  if (Buffer.byteLength(css, 'utf8') > maxBytes) return refused('CSS Module exceeds the 16 KiB bounded inspection limit.');
  let root: postcss.Root;
  try {
    root = postcss.parse(css, { from: path });
  } catch {
    return refused('CSS Module is not valid CSS under the pinned PostCSS parser.');
  }

  const classes = new Set<string>();
  for (const node of root.nodes) {
    if (node.type === 'comment') continue;
    if (node.type !== 'rule') return refused('CSS Module has an unsupported root at-rule or non-rule node.');
    const match = classSelector.exec(node.selector);
    if (!match) return refused('CSS Module selector is not one simple local class.');
    const name = match[1];
    if (classes.has(name)) return refused('CSS Module repeats a local class rule.');
    classes.add(name);
    let declarations = 0;
    for (const child of node.nodes ?? []) {
      if (child.type === 'comment') continue;
      if (child.type !== 'decl') return refused('CSS Module contains nested rules or at-rules.');
      if (!localProperties.has(child.prop)) return refused('CSS Module declaration property is outside the bounded local-property set.');
      if (child.important || !child.value.trim() || !plainValue.test(child.value)) return refused('CSS Module declaration value has unsupported syntax or priority.');
      declarations += 1;
    }
    if (!declarations) return refused('CSS Module class rule has no supported declarations.');
  }
  if (!classes.size) return refused('CSS Module has no supported local class rules.');
  return { status: 'supported', classes: [...classes].sort(), reason: null };
}
