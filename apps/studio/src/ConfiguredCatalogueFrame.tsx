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
  :root{font-family:Inter,"Avenir Next","Segoe UI",system-ui,sans-serif;color:#1d2025;background:#f5f6f8}
  *{box-sizing:border-box}body{min-height:100vh;display:flex;flex-direction:column;margin:0;padding:clamp(18px,3vw,36px);background:#f5f6f8}button{font:inherit}button:focus-visible{outline:2px solid #29323f;outline-offset:2px}
  .catalogue-header{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:20px}
  .catalogue-header p,.catalogue-header h1{margin:0}.catalogue-header p{color:#737984;font-size:9px;font-weight:750;letter-spacing:.12em;text-transform:uppercase}.catalogue-header h1{margin-top:5px;font-size:clamp(30px,5vw,50px);font-weight:650;letter-spacing:-.05em;line-height:1}.catalogue-header>p{padding:7px 9px;border:1px solid #dfe2e7;border-radius:8px;background:#fff;font-size:9px;letter-spacing:0;text-transform:none}
  .foundation-banner{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:-6px 0 16px;padding:11px 14px;border-radius:10px;background:#242a31;color:#fff;font-size:10px}.foundation-banner span{color:#ffffff8c;font-weight:700;letter-spacing:.1em;text-transform:uppercase}.foundation-banner strong{font-weight:680;text-align:right}
  .catalogue-layout{min-height:0;flex:1;display:grid;grid-template-columns:172px minmax(0,1fr);gap:14px}.catalogue-layout.no-sidebar{grid-template-columns:1fr}.catalogue-layout>section{min-width:0;display:flex;flex-direction:column}
  .category-sidebar{min-height:100%;padding:16px 12px;border:1px solid #dfe2e7;border-radius:12px;background:#fff;box-shadow:0 1px 2px #20242b08}
  .category-sidebar>strong{display:block;margin:2px 3px 14px;color:#737984;font-size:9px;font-weight:780;letter-spacing:.12em;text-transform:uppercase}.category-sidebar [role=group]{display:grid;gap:5px}
  .category-sidebar [role=group] button{min-height:36px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 10px;border:1px solid transparent;border-radius:8px;background:transparent;color:#5f6670;font-size:10px;font-weight:680;text-align:left;cursor:pointer}
  .category-sidebar [role=group] button[aria-pressed=true]{border-color:#242a31;background:#242a31;color:#fff}.category-product-count{opacity:.62;font-variant-numeric:tabular-nums}
  .result-count{margin:0 0 10px;color:#737984;font-size:10px;font-weight:680}.product-grid{min-height:0;flex:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));grid-auto-rows:minmax(260px,1fr);gap:10px}
  .product-card{min-width:0;display:grid;grid-template-rows:minmax(144px,1fr) auto;overflow:hidden;border:1px solid #e0e3e8;border-radius:12px;background:#fff;box-shadow:0 1px 2px #1d202508}.product-art{position:relative;min-height:144px;overflow:hidden;background:#c7d1da}.product-art:before,.product-art:after,.product-art i,.product-art i:before,.product-art i:after{content:"";position:absolute;display:block;box-sizing:border-box}.product-art:before{width:150px;height:150px;right:-38px;bottom:-74px;border:28px solid #ffffff38;border-radius:50%}.product-art:after{width:42%;height:8px;left:50%;bottom:14%;border-radius:999px;background:#1f29372b;filter:blur(5px);transform:translateX(-50%)}.product-art i{left:50%;top:50%;color:#2d3947;filter:drop-shadow(0 10px 9px #26313c20);transform:translate(-50%,-50%)}
  .product-art[data-product-id="p-101"]{background:#c1ccd6}.product-art[data-product-id="p-101"] i{width:82px;height:70px;border:9px solid currentColor;border-bottom-color:transparent;border-radius:46px 46px 18px 18px}.product-art[data-product-id="p-101"] i:before,.product-art[data-product-id="p-101"] i:after{top:34px;width:18px;height:34px;border:5px solid currentColor;border-radius:9px;background:#dce4ea}.product-art[data-product-id="p-101"] i:before{left:-12px;transform:rotate(-5deg)}.product-art[data-product-id="p-101"] i:after{right:-12px;transform:rotate(5deg)}
  .product-art[data-product-id="p-102"]{background:#b9c5d0}.product-art[data-product-id="p-102"] i{width:62px;height:82px;border:7px solid currentColor;border-radius:15px;background:#dce4ea;transform:translate(-50%,-50%) rotate(-3deg)}.product-art[data-product-id="p-102"] i:before{width:25px;height:25px;left:11px;top:32px;border:5px solid currentColor;border-radius:50%;background:#f4f6f7}.product-art[data-product-id="p-102"] i:after{width:8px;height:8px;left:20px;top:12px;border-radius:50%;background:currentColor;box-shadow:0 50px 0 -2px currentColor}
  .product-art[data-product-id="p-103"]{background:#d8d8cf}.product-art[data-product-id="p-103"] i{width:78px;height:10px;margin-top:34px;border-radius:50%;background:#58605a}.product-art[data-product-id="p-103"] i:before{width:8px;height:64px;left:35px;bottom:4px;border-radius:6px;background:#58605a;transform:rotate(12deg);transform-origin:bottom}.product-art[data-product-id="p-103"] i:after{width:56px;height:34px;left:21px;bottom:54px;border:7px solid #58605a;border-radius:28px 28px 9px 9px;background:#f0eee5;transform:rotate(8deg)}
  .product-art[data-product-id="p-104"]{background:#c5d5d2}.product-art[data-product-id="p-104"] i{width:88px;height:62px;border:7px solid #4e6965;border-radius:16px;background:#e5eeeb}.product-art[data-product-id="p-104"] i:before{width:42px;height:22px;left:16px;top:-23px;border:7px solid #4e6965;border-bottom:0;border-radius:14px 14px 0 0}.product-art[data-product-id="p-104"] i:after{width:7px;height:48px;left:34px;top:0;background:#4e6965;box-shadow:-24px 0 0 -2px #4e6965,24px 0 0 -2px #4e6965;opacity:.78}
  .product-art[data-product-id="p-105"]{background:#d4d5cd}.product-art[data-product-id="p-105"] i{width:92px;height:56px;margin-top:-12px;border:7px solid #575e59;border-radius:8px;background:#edece5;transform:translate(-50%,-50%) rotate(-3deg)}.product-art[data-product-id="p-105"] i:before{width:8px;height:32px;left:35px;top:48px;border-radius:0 0 5px 5px;background:#575e59}.product-art[data-product-id="p-105"] i:after{width:58px;height:8px;left:10px;top:74px;border-radius:50%;background:#575e59}
  .product-card-body{display:grid;grid-template-columns:1fr auto;gap:6px 8px;padding:14px}.product-card h2,.product-card p{margin:0}.product-card h2{font-size:14px;letter-spacing:-.02em}.product-card p{grid-column:1/-1;color:#777d86;font-size:10px;line-height:1.45}.product-card footer{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px}.product-card footer strong{font-size:11px}.product-card button{min-height:31px;padding:0 9px;border:0;border-radius:7px;background:#242a31;color:#fff;font-size:9px;font-weight:750;cursor:pointer}
  .quick-dialog{position:fixed;z-index:10;inset:0;display:grid;place-items:center;padding:20px;background:#1d20254d}.quick-dialog>section{width:min(410px,100%);padding:14px 24px 24px;border:1px solid #dfe2e7;border-radius:14px;background:#fff;box-shadow:0 24px 80px #0004}.quick-dialog-art{height:164px;margin:0 -10px 20px;border-radius:10px}.quick-dialog h2{margin:0;font-size:28px;letter-spacing:-.04em}.quick-dialog p{color:#6d737c;line-height:1.55}.quick-dialog button{border:0;border-radius:8px;padding:9px 12px;background:#242a31;color:#fff;font-weight:750}
  @media(max-width:760px){body{min-height:100vh}.product-grid{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(240px,auto)}}
  @media(max-width:560px){body{display:block;padding:14px}.catalogue-header{align-items:start;flex-direction:column}.catalogue-header>p{display:none}.foundation-banner{align-items:flex-start;flex-direction:column;gap:3px}.foundation-banner strong{text-align:left}.catalogue-layout{grid-template-columns:1fr}.category-sidebar{min-height:auto}.category-sidebar [role=group]{grid-template-columns:1fr 1fr}.product-grid{grid-template-columns:1fr}.product-card{grid-template-rows:160px auto}}
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
      <div class="product-art ${escapeHtml(product.category.toLowerCase())}" data-product-id="${escapeHtml(product.id)}" aria-hidden="true"><i></i></div><div class="product-card-body"><h2>${escapeHtml(product.name)}</h2><strong>${escapeHtml(product.price)}</strong><p><span>${escapeHtml(product.category)}</span> · ${escapeHtml(product.description)}</p>
      <footer>${quickViews.has(product.id) ? `<button data-quick-view-id="${product.id}">Quick view</button>` : '<span></span>'}</footer></div>
    </article>`).join('');
    const dialog = context.catalogue.quickViewOpen && selectedProduct && quickViews.has(selectedProduct.id)
      ? `<div class="quick-dialog"><section role="dialog" aria-modal="true" aria-label="${escapeHtml(selectedProduct.name)} quick view"><div class="product-art quick-dialog-art" data-product-id="${escapeHtml(selectedProduct.id)}" aria-hidden="true"><i></i></div><h2>${escapeHtml(selectedProduct.name)}</h2><p><strong>${escapeHtml(selectedProduct.category)} · ${escapeHtml(selectedProduct.price)}</strong><br>${escapeHtml(selectedProduct.description)}</p><button data-close-quick-view aria-label="Close quick view">Close</button></section></div>`
      : '';
    const foundationSummary = model.foundation.branchRef === 'branch-b'
      ? `${catalogueProducts.length} products ready`
      : `Foundation · ${model.foundation.label}`;
    const promotion = model.foundation.branchRef === 'branch-a'
      ? '<aside class="foundation-banner" data-foundation-change="promotion"><span>Seasonal edit</span><strong>Workspace essentials, 20% off</strong></aside>'
      : '';
    document.body.innerHTML = `<header class="catalogue-header"><div><p>Form & Field · Combined edit</p><h1>Objects for focused work.</h1></div><p>${escapeHtml(foundationSummary)}</p></header>${promotion}<main class="catalogue-layout ${model.sidebar ? '' : 'no-sidebar'}">${sidebar}<section><p class="result-count">${visibleProducts.length} products</p><div class="product-grid">${cards}</div></section></main>${dialog}`;
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
