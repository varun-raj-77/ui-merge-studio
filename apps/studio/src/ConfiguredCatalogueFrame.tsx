import { useEffect, useRef } from 'react';
import { catalogueProducts, type CatalogueProductId } from './catalogueProducts';
import { categoryLabels, categoryProductCounts } from './categorySidebarConfiguration';
import type { CataloguePreviewModel } from './catalogueIntegrationPlan';
import type { PreviewContext } from './previewContext';

interface ConfiguredCatalogueFrameProps {
  model: CataloguePreviewModel;
  context: PreviewContext;
  title: string;
  onCategoryChange: (categoryId: PreviewContext['catalogue']['categoryId']) => void;
  onQuickViewChange: (productId: CatalogueProductId | null, open: boolean) => void;
  onHistoryShortcut?: (action: 'undo' | 'redo') => void;
  onReady?: (durationMs: number) => void;
}

const styles = `
  :root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#171914;background:#f7f5ef}
  *{box-sizing:border-box}body{margin:0;padding:22px;background:#f7f5ef}button{font:inherit}
  .catalogue-header{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:18px}
  .catalogue-header p,.catalogue-header h1{margin:0}.catalogue-header p{color:#6c675d;font-size:12px}.catalogue-header h1{font-size:26px;letter-spacing:-.04em}
  .foundation-banner{display:flex;justify-content:space-between;gap:12px;margin:-8px 0 18px;padding:10px 12px;border-radius:10px;background:#fff0e9;color:#793b2c;font-size:12px}.foundation-banner strong{display:block}
  .catalogue-layout{display:grid;grid-template-columns:190px minmax(0,1fr);gap:18px}.catalogue-layout.no-sidebar{grid-template-columns:1fr}
  .category-sidebar{min-height:430px;padding:20px 14px;border:1px solid #d8d4c8;border-radius:16px;background:#eeeadf}
  .category-sidebar>strong{display:block;margin-bottom:17px}.category-sidebar [role=group]{display:grid;gap:7px}
  .category-sidebar [role=group] button{display:flex;justify-content:space-between;gap:8px;border:0;border-radius:9px;background:transparent;padding:10px;text-align:left;cursor:pointer}
  .category-sidebar [role=group] button[aria-pressed=true]{background:#171914;color:#fff}.category-product-count{opacity:.68;font-variant-numeric:tabular-nums}
  .result-count{margin:0 0 10px;color:#6c675d;font-size:12px}.product-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .product-card{min-width:0;padding:15px;border:1px solid #dedbd2;border-radius:14px;background:#fff}.product-card h2,.product-card p{margin:0}.product-card h2{font-size:16px}.product-card p{margin-top:6px;color:#6c675d;font-size:12px}.product-card footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:14px}.product-card button{border:0;border-radius:8px;padding:8px 10px;background:#715ee8;color:#fff;font-weight:800;cursor:pointer}
  .quick-dialog{position:fixed;inset:0;display:grid;place-items:center;padding:20px;background:#17191466}.quick-dialog>section{width:min(390px,100%);padding:20px;border-radius:16px;background:#fff;box-shadow:0 24px 80px #0004}.quick-dialog h2{margin:0}.quick-dialog p{color:#6c675d}.quick-dialog button{border:0;border-radius:8px;padding:9px 12px;background:#171914;color:#fff;font-weight:800}
  @media(max-width:640px){body{padding:12px}.catalogue-layout{grid-template-columns:128px minmax(0,1fr);gap:10px}.product-grid{grid-template-columns:1fr}.category-sidebar{padding:15px 8px}.category-sidebar [role=group] button{padding:8px 6px}}
  @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
`;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]!);
}

export function ConfiguredCatalogueFrame({
  model,
  context,
  title,
  onCategoryChange,
  onQuickViewChange,
  onHistoryShortcut,
  onReady
}: ConfiguredCatalogueFrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const callbacks = useRef({ onCategoryChange, onQuickViewChange, onHistoryShortcut, onReady });
  callbacks.current = { onCategoryChange, onQuickViewChange, onHistoryShortcut, onReady };

  const render = () => {
    const started = performance.now();
    const document = frame.current?.contentDocument;
    if (!document?.body) return;
    const categoryId = context.catalogue.categoryId;
    const categoryLabel = categoryLabels([categoryId])[0];
    const visibleProducts = categoryId === 'all'
      ? catalogueProducts
      : catalogueProducts.filter(product => product.category === categoryLabel);
    const counts = categoryProductCounts();
    const quickViews = new Set(model.quickViewProductIds);
    const selectedProduct = context.catalogue.selectedProductId
      ? catalogueProducts.find(product => product.id === context.catalogue.selectedProductId)
      : null;
    const sidebar = model.sidebar ? `<aside class="category-sidebar" aria-label="Category sidebar">
      ${model.sidebar.showHeading ? '<strong>Categories</strong>' : ''}
      <div role="group" aria-label="Product categories">${model.sidebar.enabledCategoryIds.map(id => {
        const label = categoryLabels([id])[0];
        return `<button data-category-id="${id}" aria-pressed="${id === categoryId}"><span>${escapeHtml(label)}</span>${model.sidebar!.showProductCounts ? `<span class="category-product-count" data-ums-product-count="${id}" aria-hidden="true">${counts[id]}</span>` : ''}</button>`;
      }).join('')}</div>
    </aside>` : '';
    const cards = visibleProducts.map(product => `<article class="product-card" data-product-id="${product.id}">
      <h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.category)}</p>
      <footer><strong>${escapeHtml(product.price)}</strong>${quickViews.has(product.id) ? `<button data-quick-view-id="${product.id}">Quick view</button>` : ''}</footer>
    </article>`).join('');
    const dialog = context.catalogue.quickViewOpen && selectedProduct && quickViews.has(selectedProduct.id)
      ? `<div class="quick-dialog"><section role="dialog" aria-modal="true" aria-label="${escapeHtml(selectedProduct.name)} quick view"><h2>${escapeHtml(selectedProduct.name)}</h2><p>${escapeHtml(selectedProduct.category)} · ${escapeHtml(selectedProduct.price)}</p><button data-close-quick-view aria-label="Close quick view">Close</button></section></div>`
      : '';
    const foundationSummary = model.foundation.branchRef === 'branch-b'
      ? `${catalogueProducts.length} products ready`
      : `Foundation · ${model.foundation.label}`;
    const promotion = model.foundation.branchRef === 'branch-a'
      ? '<aside class="foundation-banner" data-foundation-change="promotion"><span>Seasonal edit</span><strong>Workspace essentials, 20% off</strong></aside>'
      : '';
    document.body.innerHTML = `<header class="catalogue-header"><div><p>Configured Product Catalogue</p><h1>Workspace essentials</h1></div><p>${escapeHtml(foundationSummary)}</p></header>${promotion}<main class="catalogue-layout ${model.sidebar ? '' : 'no-sidebar'}">${sidebar}<section><p class="result-count">${visibleProducts.length} products</p><div class="product-grid">${cards}</div></section></main>${dialog}`;
    document.documentElement.dataset.integrationPlanId = model.planIdentity;
    document.documentElement.dataset.historicalArtifactRequired = 'false';
    document.querySelectorAll<HTMLButtonElement>('[data-category-id]').forEach(button => {
      button.onclick = () => callbacks.current.onCategoryChange(button.dataset.categoryId as PreviewContext['catalogue']['categoryId']);
    });
    document.querySelectorAll<HTMLButtonElement>('[data-quick-view-id]').forEach(button => {
      button.onclick = () => callbacks.current.onQuickViewChange(button.dataset.quickViewId as CatalogueProductId, true);
    });
    const close = document.querySelector<HTMLButtonElement>('[data-close-quick-view]');
    if (close) {
      close.onclick = () => callbacks.current.onQuickViewChange(null, false);
      close.focus();
    }
    callbacks.current.onReady?.(performance.now() - started);
  };

  useEffect(() => {
    const contentWindow = frame.current?.contentWindow;
    if (!contentWindow) return;
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'z') {
        const target = event.target as Element | null;
        if (target?.closest?.('input, textarea, select, [contenteditable]')) return;
        event.preventDefault();
        callbacks.current.onHistoryShortcut?.(event.shiftKey ? 'redo' : 'undo');
      }
    };
    contentWindow.addEventListener('keydown', listener);
    return () => contentWindow.removeEventListener('keydown', listener);
  }, []);

  useEffect(render, [
    model.planIdentity,
    context.catalogue.categoryId,
    context.catalogue.selectedProductId,
    context.catalogue.quickViewOpen
  ]);

  return <iframe
    ref={frame}
    title={title}
    className="artifact-frame configured-runtime-frame"
    srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>${styles}</style></head><body></body></html>`}
    onLoad={render}
  />;
}
