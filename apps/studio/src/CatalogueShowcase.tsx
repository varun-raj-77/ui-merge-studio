import { useEffect, useMemo, useReducer, useRef, useState, type RefObject } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, CircleEllipsis, GitBranch, History, Info, MousePointer2, RotateCcw, ShieldCheck, Trash2, X } from 'lucide-react';
import type { PublicArtifact, PublicCandidate } from '../../../packages/showcase-evidence/src/schema';
import { catalogueManifest, evidenceForScope, recordedRefusal, resolveCatalogueCandidate } from './catalogueEvidence';
import { ConfiguredCatalogueFrame } from './ConfiguredCatalogueFrame';
import {
  catalogueFoundation,
  catalogueFoundationLabels,
  catalogueFoundationOptions,
  cataloguePlanIdentity,
  changeCatalogueFoundation,
  foundationIncludesCapability,
  hasIncompatibleProductId,
  integrationPlanToEvidenceSummary,
  integrationPlanToGenerationRequest,
  integrationPlanToPreviewModel,
  integrationPlanToVerificationExpectations
} from './catalogueIntegrationPlan';
import { IntegrationPlanRefusal } from '../../../packages/integration-plan/src/integrationPlan';
import { catalogueProduct } from './catalogueProducts';
import {
  catalogueCapabilityForScope,
  catalogueCapabilityFromRuntime,
  catalogueScopesForCapability,
  catalogueSelectionCapabilities,
  quickViewAllCapabilityId,
  type CatalogueSourceBranch
} from './catalogueSelectionCapabilities';
import {
  candidateKey,
  categorySidebarDecision,
  hasQuickViewSelection,
  selectionScopes,
  scopeIdentityKey,
  scopeKey,
  showcaseSelectionReducer,
  type ShowcaseScope
} from './showcaseSelection';
import {
  selectionCapabilityCompatibility,
  type SelectionCapability
} from './selectionCapability';
import {
  initialSelectionHistory,
  selectionHistoryReducer,
  selectionHistoryShortcut
} from './selectionHistory';
import {
  acceptIntentionalContext,
  createApplyPreviewContextCommand,
  defaultPreviewContext,
  parsePreviewContextMessage,
  type PreviewCapabilities,
  type PreviewContext,
  type PreviewContextMessage,
  type PreviewContextNotice
} from './previewContext';
import {
  categoryLabels,
  categoryProductCounts,
  categorySidebarRepositoryMetadata,
  completeCategorySidebarConfiguration,
  configuredCategoryPreviewContext,
  createCategorySidebarConfigurationSelection,
  normalizeCategorySidebarConfiguration,
  CategorySidebarConfigurationRefusal,
  type CategorySidebarConfiguration
} from './categorySidebarConfiguration';
import {
  PublicLanding,
  ShowcaseResultSummary,
  githubUrl
} from './CataloguePublic';
import { Button } from './ui/Button';
import { Kbd } from './ui/Kbd';
import { DropdownItem, DropdownMenu, DropdownSeparator, Popover, Sheet, Tabs, TabsContent, TabsList, TabsTrigger, Tooltip } from './ui/Surface';

type View = 'landing' | 'compare';
type ComparisonPreview = 'branch-a' | 'branch-b';
type WorkspaceState = 'comparison' | 'combined';
type EvidenceTab = 'overview' | 'dependencies' | 'integration' | 'verification';
const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

interface ArtifactFrameProps {
  artifact: PublicArtifact;
  title: string;
  previewId: string;
  context: PreviewContext;
  selectedScopes: string[];
  selectionEnabled?: boolean;
  visibilitySignal?: boolean;
  resolveCapability?: (scope: string, visibleLabel: string) => SelectionCapability<CatalogueSourceBranch>;
  onToggle?: (capability: SelectionCapability<CatalogueSourceBranch>) => void;
  onUnsupportedCapability?: (capability: SelectionCapability<CatalogueSourceBranch>) => void;
  onDetailsCapability?: (capability: SelectionCapability<CatalogueSourceBranch>) => void;
  onHistoryShortcut?: (action: 'undo' | 'redo') => void;
  onContextMessage: (message: PreviewContextMessage) => void;
  categoryConfiguration?: CategorySidebarConfiguration | null;
  revealSelections?: boolean;
  onEnterPick?: () => void;
}

function applyConfiguredCategoryOptions(
  document: Document | null | undefined,
  configuration?: CategorySidebarConfiguration | null
) {
  if (!document) return;
  const enabledLabels = new Set(configuration ? categoryLabels(configuration.enabledCategoryIds) : []);
  const counts = categoryProductCounts();
  const categoryIdsByLabel = new Map(categorySidebarRepositoryMetadata.categories.map(category => [category.label, category.id]));
  const sidebar = document.querySelector<HTMLElement>('[data-ums-scope="category-sidebar"]');
  const heading = sidebar?.querySelector<HTMLElement>(':scope > strong');
  if (heading) {
    const headingHidden = Boolean(configuration && !configuration.showHeading);
    heading.hidden = headingHidden;
    heading.toggleAttribute('data-ums-configuration-hidden', headingHidden);
    const nextDisplay = headingHidden ? 'none' : '';
    if (heading.style.display !== nextDisplay) heading.style.display = nextDisplay;
  }
  document.querySelectorAll<HTMLButtonElement>('[aria-label="Product categories"] button').forEach(button => {
    const existingCount = button.querySelector<HTMLElement>('[data-ums-product-count]');
    const label = button.dataset.umsCategoryLabel ?? button.textContent?.trim() ?? '';
    button.dataset.umsCategoryLabel = label;
    const retained = !configuration || enabledLabels.has(label);
    button.hidden = !retained;
    button.toggleAttribute('data-ums-configuration-excluded', !retained);
    const categoryId = categoryIdsByLabel.get(label);
    if (configuration?.showProductCounts && categoryId) {
      const count = existingCount ?? document.createElement('span');
      if (!existingCount) {
        count.className = 'category-product-count';
        count.dataset.umsProductCount = categoryId;
        count.setAttribute('aria-hidden', 'true');
      }
      const nextCount = String(counts[categoryId]);
      if (count.textContent !== nextCount) count.textContent = nextCount;
      if (!existingCount) button.append(count);
    } else existingCount?.remove();
  });
  document.documentElement?.toggleAttribute('data-ums-configured-preview', Boolean(configuration));
}

function applyShowcasePresentation(document: Document | null | undefined) {
  if (!document?.head) return;
  if (!document.getElementById('ums-showcase-presentation')) {
    const style = document.createElement('style');
    style.id = 'ums-showcase-presentation';
    style.textContent = `
    :root { color: #20242a !important; background: #f7f7f5 !important; }
    body { background: #f7f7f5 !important; }
    .promotional-banner { min-height: 44px !important; display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 14px !important; margin: -8px 0 16px !important; padding: 10px 14px !important; border-radius: 10px !important; background: #242a31 !important; color: #fff !important; }
    .promotional-banner small { color: #ffffff8c !important; font-size: 9px !important; font-weight: 750 !important; letter-spacing: .12em !important; text-transform: uppercase !important; }
    .promotional-banner strong { font-size: 11px !important; font-weight: 680 !important; }
    .product-art { position: relative !important; overflow: hidden !important; background: #c7d1da !important; }
    .product-art::before, .product-art::after, .product-art i, .product-art i::before, .product-art i::after { content: "" !important; position: absolute !important; display: block !important; box-sizing: border-box !important; }
    .product-art::before { width: 150px !important; height: 150px !important; right: -38px !important; bottom: -74px !important; left: auto !important; top: auto !important; border: 28px solid #ffffff38 !important; border-radius: 50% !important; background: transparent !important; transform: none !important; }
    .product-art::after { width: 42% !important; height: 8px !important; left: 50% !important; right: auto !important; bottom: 14% !important; border-radius: 999px !important; background: #1f29372b !important; filter: blur(5px) !important; transform: translateX(-50%) !important; }
    .product-art i { left: 50% !important; top: 50% !important; margin: 0 !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; color: #2d3947 !important; box-shadow: none !important; filter: drop-shadow(0 10px 9px #26313c20) !important; transform: translate(-50%, -50%) !important; }
    .product-art[data-product-id="p-101"] { background: #c1ccd6 !important; }
    .product-art[data-product-id="p-101"] i { width: 82px !important; height: 70px !important; border: 9px solid currentColor !important; border-bottom-color: transparent !important; border-radius: 46px 46px 18px 18px !important; }
    .product-art[data-product-id="p-101"] i::before, .product-art[data-product-id="p-101"] i::after { top: 34px !important; width: 18px !important; height: 34px !important; border: 5px solid currentColor !important; border-radius: 9px !important; background: #dce4ea !important; }
    .product-art[data-product-id="p-101"] i::before { left: -12px !important; transform: rotate(-5deg) !important; }
    .product-art[data-product-id="p-101"] i::after { right: -12px !important; transform: rotate(5deg) !important; }
    .product-art[data-product-id="p-102"] { background: #b9c5d0 !important; }
    .product-art[data-product-id="p-102"] i { width: 62px !important; height: 82px !important; border: 7px solid currentColor !important; border-radius: 15px !important; background: #dce4ea !important; transform: translate(-50%, -50%) rotate(-3deg) !important; }
    .product-art[data-product-id="p-102"] i::before { width: 25px !important; height: 25px !important; left: 11px !important; top: 32px !important; border: 5px solid currentColor !important; border-radius: 50% !important; background: #f4f6f7 !important; }
    .product-art[data-product-id="p-102"] i::after { width: 8px !important; height: 8px !important; left: 20px !important; top: 12px !important; border-radius: 50% !important; background: currentColor !important; box-shadow: 0 50px 0 -2px currentColor !important; }
    .product-art[data-product-id="p-103"] { background: #d8d8cf !important; }
    .product-art[data-product-id="p-103"] i { width: 78px !important; height: 10px !important; margin-top: 34px !important; border-radius: 50% !important; background: #58605a !important; }
    .product-art[data-product-id="p-103"] i::before { width: 8px !important; height: 64px !important; left: 35px !important; bottom: 4px !important; border-radius: 6px !important; background: #58605a !important; transform: rotate(12deg) !important; transform-origin: bottom !important; }
    .product-art[data-product-id="p-103"] i::after { width: 56px !important; height: 34px !important; left: 21px !important; bottom: 54px !important; border: 7px solid #58605a !important; border-radius: 28px 28px 9px 9px !important; background: #f0eee5 !important; transform: rotate(8deg) !important; }
    .product-art[data-product-id="p-104"] { background: #c5d5d2 !important; }
    .product-art[data-product-id="p-104"] i { width: 88px !important; height: 62px !important; border: 7px solid #4e6965 !important; border-radius: 16px !important; background: #e5eeeb !important; }
    .product-art[data-product-id="p-104"] i::before { width: 42px !important; height: 22px !important; left: 16px !important; top: -23px !important; border: 7px solid #4e6965 !important; border-bottom: 0 !important; border-radius: 14px 14px 0 0 !important; }
    .product-art[data-product-id="p-104"] i::after { width: 7px !important; height: 48px !important; left: 34px !important; top: 0 !important; background: #4e6965 !important; box-shadow: -24px 0 0 -2px #4e6965, 24px 0 0 -2px #4e6965 !important; opacity: .78 !important; }
    .product-art[data-product-id="p-105"] { background: #d4d5cd !important; }
    .product-art[data-product-id="p-105"] i { width: 92px !important; height: 56px !important; margin-top: -12px !important; border: 7px solid #575e59 !important; border-radius: 8px !important; background: #edece5 !important; transform: translate(-50%, -50%) rotate(-3deg) !important; }
    .product-art[data-product-id="p-105"] i::before { width: 8px !important; height: 32px !important; left: 35px !important; top: 48px !important; border-radius: 0 0 5px 5px !important; background: #575e59 !important; }
    .product-art[data-product-id="p-105"] i::after { width: 58px !important; height: 8px !important; left: 10px !important; top: 74px !important; border-radius: 50% !important; background: #575e59 !important; }
    .quick-view-shelf { gap: 10px !important; padding: 16px !important; border-color: #dfe2e6 !important; border-radius: 12px !important; background: #f3f4f6 !important; }
    .quick-view-launchers { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 7px !important; }
    .quick-view-launchers button { min-height: 38px !important; border: 1px solid #d9dde2 !important; border-radius: 8px !important; background: #fff !important; color: #252a31 !important; box-shadow: 0 1px 2px #1d202508 !important; }
    .quick-view-launchers button:hover { border-color: #9fa5ad !important; background: #f8f9fa !important; }
    .quick-view { padding-top: 20px !important; border-left: 1px solid #dfe2e6 !important; background: #fff !important; }
    .quick-view::before { display: none !important; }
    .quick-view > button { z-index: 2 !important; }
    .quick-view .quick-view-art { position: relative !important; height: 148px !important; margin: -6px -14px 20px !important; border-radius: 10px !important; pointer-events: none !important; }
    @media (max-width: 520px) {
      .quick-view-launchers { grid-template-columns: 1fr !important; }
    }
  `;
    document.head.append(style);
  }
  const productIds = new Map([
    ['Arc Headphones', 'p-101'],
    ['Studio Speaker', 'p-102'],
    ['Task Lamp', 'p-103'],
    ['Carry Case', 'p-104'],
    ['Desk Stand', 'p-105']
  ]);
  document.querySelectorAll<HTMLElement>('.product-card').forEach(card => {
    const id = productIds.get(card.querySelector('h2')?.textContent?.trim() ?? '');
    const art = card.querySelector<HTMLElement>('.product-art');
    if (id && art) art.dataset.productId = id;
  });
  const quickView = document.querySelector<HTMLElement>('.quick-view');
  const quickViewId = productIds.get(quickView?.querySelector('h2')?.textContent?.trim() ?? '');
  if (quickView && quickViewId && !quickView.querySelector('.quick-view-art')) {
    const art = document.createElement('div');
    art.className = 'product-art quick-view-art';
    art.dataset.productId = quickViewId;
    art.setAttribute('aria-hidden', 'true');
    art.append(document.createElement('i'));
    quickView.querySelector('button')?.after(art);
  }
}

function selectionRegionTarget(
  document: Document,
  element: HTMLElement,
  capability: SelectionCapability<CatalogueSourceBranch>,
  visibleLabel: string
) {
  if (capability.kind !== 'feature-instance') return element;
  const productName = visibleLabel.replace(/^Quick View on /, '').trim();
  return Array.from(document.querySelectorAll<HTMLElement>('article')).find(article => (
    article.querySelector('h2')?.textContent?.trim() === productName
  )) ?? element.closest<HTMLElement>('article') ?? element;
}

function contextualControlLabel(capability: SelectionCapability, selected: boolean) {
  if (!capability.supported) return 'Why unavailable';
  if (selected) return 'Kept';
  if (capability.kind === 'whole-feature') return 'Keep sidebar';
  if (capability.kind === 'all-instances') return 'Keep all';
  if (capability.kind === 'configurable-subset') return 'Configure';
  return 'Keep Quick View';
}

function installContextualControls(
  frame: HTMLIFrameElement | null,
  enabled: boolean,
  selectedScopes: string[],
  resolveCapability?: (scope: string, visibleLabel: string) => SelectionCapability<CatalogueSourceBranch>,
  onToggle?: (capability: SelectionCapability<CatalogueSourceBranch>) => void,
  onUnsupportedCapability?: (capability: SelectionCapability<CatalogueSourceBranch>) => void,
  onDetailsCapability?: (capability: SelectionCapability<CatalogueSourceBranch>) => void
) {
  const document = frame?.contentDocument;
  if (!document?.body) return;
  const styleId = 'ums-contextual-selection-style';
  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      [data-ums-scope] { position: relative; }
      [data-ums-scope][data-ums-selectable] {
        outline: 1px dashed transparent; outline-offset: 3px;
        transition: outline-color 140ms ease, box-shadow 140ms ease;
      }
      [data-ums-scope][data-ums-selectable]:hover,
      [data-ums-scope][data-ums-selectable]:focus-within {
        outline-color: color-mix(in srgb, #665cf6 58%, transparent);
        box-shadow: 0 0 0 5px #665cf60e;
      }
      .ums-contextual-selection-layer {
        position: fixed; inset: 0; z-index: 2147483000;
        overflow: hidden; pointer-events: none;
      }
      .ums-context-add {
        display: inline-flex; align-items: center; gap: 5px;
        min-height: 30px; padding: 6px 9px;
        border: 1px solid #322f2b; border-radius: 8px;
        background: #25221f; color: #fff;
        box-shadow: 0 7px 20px #17191426;
        font: 800 11px/1 system-ui, sans-serif;
        opacity: 0; transform: translateY(3px); pointer-events: none; cursor: pointer;
        transition: opacity 180ms ease, transform 180ms ease;
      }
      .ums-context-control-group {
        position: fixed; display: flex; gap: 5px;
        pointer-events: none;
      }
      .ums-context-control-group[data-visible] .ums-context-add,
      .ums-context-add:focus-visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
      .ums-context-add:hover, .ums-context-add:focus-visible { background: #161412; }
      [data-ums-scope][data-ums-selected] {
        outline: 2px solid #665cf6; outline-offset: 3px;
        box-shadow: 0 0 0 6px #665cf61f;
      }
      .ums-context-add[data-selected] {
        border-color: #665cf6; background: #665cf6; color: #fff;
      }
      .ums-context-add[data-unsupported] {
        border-color: #9a6b29; background: #fff8e9; color: #69440e;
      }
      .ums-context-add:focus-visible { outline: 3px solid #665cf6; outline-offset: 2px; }
      .ums-contextual-selection-layer[data-mobile] { position: absolute; overflow: visible; }
      .ums-contextual-selection-layer[data-mobile] .ums-context-control-group { position: absolute; }
      .ums-contextual-selection-layer[data-mobile] .ums-context-add { opacity: 1; transform: translateY(0); pointer-events: auto; }
      @media (prefers-reduced-motion: reduce) {
        .ums-context-add { transition: none; }
      }
    `;
    document.head.append(style);
  }

  const selected = new Set(selectedScopes);
  let layer = document.querySelector<HTMLElement>('.ums-contextual-selection-layer');
  if (!layer && enabled) {
    layer = document.createElement('div');
    layer.className = 'ums-contextual-selection-layer';
    layer.setAttribute('aria-label', 'Source-backed integration actions');
    document.body.append(layer);
  }
  if (!enabled) {
    layer?.remove();
    document.querySelectorAll<HTMLElement>('[data-ums-scope]').forEach(element => {
      element.removeAttribute('data-ums-selected');
      element.removeAttribute('data-ums-selectable');
    });
    return;
  }
  layer?.toggleAttribute('data-mobile', window.innerWidth < 960);
  const activeScopes = new Set<string>();
  document.querySelectorAll<HTMLElement>('[data-ums-scope]').forEach(element => {
    const scope = element.dataset.umsScope;
    if (!scope) return;
    const visibleLabel = element.dataset.umsLabel ?? scope;
    const capability = resolveCapability?.(scope, visibleLabel);
    if (!capability) return;
    activeScopes.add(scope);
    element.setAttribute('data-ums-selectable', '');
    element.toggleAttribute('data-ums-selected', selected.has(scope));
    let group = layer!.querySelector<HTMLElement>(`.ums-context-control-group[data-scope="${CSS.escape(scope)}"]`);
    if (!group) {
      group = document.createElement('div');
      group.className = 'ums-context-control-group';
      group.dataset.scope = scope;
      layer!.append(group);
    }
    let control = group.querySelector<HTMLButtonElement>('.ums-context-add');
    if (!control) {
      control = document.createElement('button');
      control.type = 'button';
      control.className = 'ums-context-add';
      control.dataset.scope = scope;
      group.append(control);
    }
    const isSelected = selected.has(scope);
    const text = `${isSelected ? '✓' : capability.supported ? '+' : 'i'} ${contextualControlLabel(capability, isSelected)}`;
    if (control.textContent !== text) control.textContent = text;
    control.dataset.capabilityKind = capability.kind;
    control.dataset.pageId = capability.pageId;
    control.dataset.route = capability.route;
    control.toggleAttribute('data-selected', isSelected);
    control.toggleAttribute('data-unsupported', !capability.supported);
    control.setAttribute(
      'aria-label',
      capability.supported
        ? `${isSelected ? 'Remove' : 'Keep'} ${visibleLabel}${isSelected ? '' : ` from ${capability.sourceBranch === 'branch-a' ? 'Version A' : 'Version B'}`}`
        : `${capability.label} unavailable: ${capability.unsupportedReason}`
    );
    control.title = capability.supported ? capability.label : capability.unsupportedReason ?? '';
    const rect = element.getBoundingClientRect();
    const frameWindow = document.defaultView;
    const frameWidth = frameWindow?.innerWidth ?? 0;
    const frameHeight = document.defaultView?.innerHeight ?? 0;
    const offset = capability.kind === 'whole-feature' ? 196 : 182;
    const mobile = Boolean(layer?.hasAttribute('data-mobile'));
    const scrollX = mobile ? frameWindow?.scrollX ?? 0 : 0;
    const scrollY = mobile ? frameWindow?.scrollY ?? 0 : 0;
    group.style.top = `${mobile ? Math.max(8, rect.top + scrollY + 9) : Math.max(8, rect.top + 9)}px`;
    group.style.left = `${Math.max(scrollX + 8, Math.min(scrollX + frameWidth - offset, rect.right + scrollX - offset))}px`;
    group.hidden = mobile ? false : rect.bottom < 0 || rect.top > frameHeight;
    control.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      if (capability.supported) onToggle?.(capability);
      else onUnsupportedCapability?.(capability);
    };
    const showControl = () => group?.setAttribute('data-visible', '');
    const hideControl = () => setTimeout(() => {
      if (!group?.matches(':hover') && !element.matches(':hover') && !element.matches(':focus-within')) group?.removeAttribute('data-visible');
    }, 60);
    element.onmouseenter = showControl;
    element.onmouseleave = hideControl;
    element.onfocus = showControl;
    element.onblur = hideControl;
    group.onmouseenter = showControl;
    group.onmouseleave = hideControl;
  });
  layer?.querySelectorAll<HTMLElement>('.ums-context-control-group').forEach(group => {
    if (!activeScopes.has(group.dataset.scope ?? '')) group.remove();
  });
  const reposition = () => {
    layer?.querySelectorAll<HTMLElement>('.ums-context-control-group').forEach(group => {
      const scope = group.dataset.scope;
      const element = scope
        ? document.querySelector<HTMLElement>(`[data-ums-scope="${CSS.escape(scope)}"]`)
        : null;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const frameWindow = document.defaultView;
      const frameWidth = frameWindow?.innerWidth ?? 0;
      const frameHeight = frameWindow?.innerHeight ?? 0;
      const offset = scope === 'category-sidebar' ? 196 : 182;
      const mobile = Boolean(layer?.hasAttribute('data-mobile'));
      const scrollX = mobile ? frameWindow?.scrollX ?? 0 : 0;
      const scrollY = mobile ? frameWindow?.scrollY ?? 0 : 0;
      group.style.top = `${mobile ? Math.max(8, rect.top + scrollY + 9) : Math.max(8, rect.top + 9)}px`;
      group.style.left = `${Math.max(scrollX + 8, Math.min(scrollX + frameWidth - offset, rect.right + scrollX - offset))}px`;
      group.hidden = mobile ? false : rect.bottom < 0 || rect.top > frameHeight;
    });
  };
  (layer as HTMLElement & { __umsReposition?: () => void }).__umsReposition = reposition;
  if (!document.documentElement.hasAttribute('data-ums-context-listeners')) {
    document.documentElement.setAttribute('data-ums-context-listeners', '');
    const update = () => {
      const current = document.querySelector<HTMLElement>('.ums-contextual-selection-layer') as
        (HTMLElement & { __umsReposition?: () => void }) | null;
      current?.__umsReposition?.();
    };
    document.defaultView?.addEventListener('scroll', update, { passive: true });
    document.defaultView?.addEventListener('resize', update);
  }
}

interface SelectionRegionGeometry {
  scope: string;
  visibleLabel: string;
  capability: SelectionCapability<CatalogueSourceBranch>;
  top: number;
  left: number;
  width: number;
  height: number;
}

function sameRegionGeometry(current: SelectionRegionGeometry[], next: SelectionRegionGeometry[]) {
  if (current.length !== next.length) return false;
  return current.every((region, index) => {
    const candidate = next[index];
    return candidate
      && region.scope === candidate.scope
      && region.visibleLabel === candidate.visibleLabel
      && region.top === candidate.top
      && region.left === candidate.left
      && region.width === candidate.width
      && region.height === candidate.height
      && region.capability.id === candidate.capability.id;
  });
}

function selectionLabel(capability: SelectionCapability<CatalogueSourceBranch>) {
  if (capability.id === 'category-sidebar') return 'Category sidebar';
  return capability.label.replace(/^Add /, '');
}

function ArtifactFrame({
  artifact,
  title,
  previewId,
  context,
  selectedScopes,
  selectionEnabled = false,
  visibilitySignal,
  resolveCapability,
  onToggle,
  onUnsupportedCapability,
  onDetailsCapability,
  onHistoryShortcut,
  onContextMessage,
  categoryConfiguration,
  revealSelections = false,
  onEnterPick
}: ArtifactFrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const scopeObserver = useRef<MutationObserver | null>(null);
  const frameCleanup = useRef<(() => void) | null>(null);
  const [regions, setRegions] = useState<SelectionRegionGeometry[]>([]);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const resolveCapabilityRef = useRef(resolveCapability);
  const toggleRef = useRef(onToggle);
  const historyShortcutRef = useRef(onHistoryShortcut);
  const enterPickRef = useRef(onEnterPick);
  const contextMessageRef = useRef(onContextMessage);
  const contextRef = useRef(context);
  const selectedScopesRef = useRef(selectedScopes);
  const categoryConfigurationRef = useRef(categoryConfiguration);
  const selectionEnabledRef = useRef(selectionEnabled);
  const applySequence = useRef(0);
  resolveCapabilityRef.current = resolveCapability;
  toggleRef.current = onToggle;
  historyShortcutRef.current = onHistoryShortcut;
  enterPickRef.current = onEnterPick;
  contextMessageRef.current = onContextMessage;
  contextRef.current = context;
  selectedScopesRef.current = selectedScopes;
  categoryConfigurationRef.current = categoryConfiguration;
  selectionEnabledRef.current = selectionEnabled;
  const refreshSelectionRegions = () => {
    const document = frame.current?.contentDocument;
    applyShowcasePresentation(document);
    applyConfiguredCategoryOptions(document, categoryConfigurationRef.current);
    if (!selectionEnabledRef.current || !document?.body) {
      setRegions(current => current.length ? [] : current);
      return;
    }
    const frameWindow = document.defaultView;
    const frameWidth = frameWindow?.innerWidth ?? 0;
    const frameHeight = frameWindow?.innerHeight ?? 0;
    const next = Array.from(document.querySelectorAll<HTMLElement>('[data-ums-scope]:not([data-ums-selection-region])')).flatMap(element => {
      const scope = element.dataset.umsScope;
      if (!scope) return [];
      const visibleLabel = element.dataset.umsLabel ?? scope;
      const capability = resolveCapabilityRef.current?.(scope, visibleLabel)
        ?? catalogueCapabilityFromRuntime(scope, previewId as CatalogueSourceBranch, visibleLabel);
      if (!capability.supported) return [];
      const selectionTarget = selectionRegionTarget(document, element, capability, visibleLabel);
      const rect = selectionTarget.getBoundingClientRect();
      const style = frameWindow?.getComputedStyle?.(selectionTarget);
      if (style?.display === 'none' || style?.visibility === 'hidden') return [];
      const hasBrowserGeometry = rect.width > 0 && rect.height > 0;
      if (hasBrowserGeometry && (rect.bottom < 0 || rect.right < 0 || rect.top > frameHeight || rect.left > frameWidth)) return [];
      return [{
        scope,
        visibleLabel,
        capability,
        top: Math.round(Math.max(0, rect.top)),
        left: Math.round(Math.max(0, rect.left)),
        width: Math.round(Math.min(rect.width || 1, Math.max(1, frameWidth - Math.max(0, rect.left)))),
        height: Math.round(Math.min(rect.height || 1, Math.max(1, frameHeight - Math.max(0, rect.top))))
      }];
    });
    setRegions(current => sameRegionGeometry(current, next) ? current : next);
  };
  const postState = () => {
    frame.current?.contentWindow?.postMessage({
      type: 'ums-showcase-mode',
      mode: 'play',
      showChanges: false,
      selectedScopes: selectedScopesRef.current
    }, location.origin);
    refreshSelectionRegions();
  };
  const postContext = () => {
    applySequence.current += 1;
    frame.current?.contentWindow?.postMessage(
      createApplyPreviewContextCommand(previewId, contextRef.current, applySequence.current),
      location.origin
    );
  };
  const bindFrame = () => {
    scopeObserver.current?.disconnect();
    frameCleanup.current?.();
    postState();
    const body = frame.current?.contentDocument?.body;
    const contentWindow = frame.current?.contentWindow;
    const cleanups: Array<() => void> = [];
    if (contentWindow) {
      const keyListener = (event: KeyboardEvent) => {
        const action = selectionHistoryShortcut(event);
        if (action && historyShortcutRef.current) {
          event.preventDefault();
          historyShortcutRef.current(action);
          return;
        }
        const target = event.target;
        const typing = target instanceof Element && target.matches('input, textarea, select, [contenteditable="true"]');
        if (!typing && !event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'p') {
          event.preventDefault();
          enterPickRef.current?.();
        }
      };
      const geometryListener = () => requestAnimationFrame(refreshSelectionRegions);
      contentWindow.addEventListener('keydown', keyListener);
      contentWindow.addEventListener('scroll', geometryListener, { passive: true });
      contentWindow.addEventListener('resize', geometryListener);
      const geometryInterval = selectionEnabledRef.current
        ? window.setInterval(refreshSelectionRegions, 120)
        : null;
      cleanups.push(
        () => contentWindow.removeEventListener('keydown', keyListener),
        () => contentWindow.removeEventListener('scroll', geometryListener),
        () => contentWindow.removeEventListener('resize', geometryListener),
        () => {
          if (geometryInterval !== null) window.clearInterval(geometryInterval);
        }
      );
    }
    if (body) {
      scopeObserver.current = new MutationObserver(() => requestAnimationFrame(refreshSelectionRegions));
      scopeObserver.current.observe(body, { childList: true, subtree: true });
    }
    frameCleanup.current = () => cleanups.forEach(cleanup => cleanup());
  };

  useEffect(() => {
    postState();
    bindFrame();
    const repositionFrame = requestAnimationFrame(refreshSelectionRegions);
    const settledFrame = setTimeout(refreshSelectionRegions, 100);
    return () => {
      cancelAnimationFrame(repositionFrame);
      clearTimeout(settledFrame);
    };
  }, [
    selectionEnabled,
    selectedScopes.join(','),
    visibilitySignal,
    categoryConfiguration?.enabledCategoryIds.join(','),
    categoryConfiguration?.defaultCategoryId,
    categoryConfiguration?.showHeading,
    categoryConfiguration?.showProductCounts
  ]);
  useEffect(postContext, [
    context.route,
    context.viewport.width,
    context.viewport.height,
    context.scroll.xRatio,
    context.scroll.yRatio,
    context.catalogue.categoryId,
    context.catalogue.searchQuery,
    context.catalogue.sortId,
    context.catalogue.selectedProductId,
    context.catalogue.quickViewOpen
  ]);
  useEffect(() => () => {
    scopeObserver.current?.disconnect();
    frameCleanup.current?.();
  }, []);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'ums-showcase-ready') {
        bindFrame();
        return;
      }
      const message = parsePreviewContextMessage(event.data, previewId);
      if (!message) return;
      contextMessageRef.current(message);
      if (message.type === 'ums-preview-context-ready') postContext();
    };
    addEventListener('message', listener);
    return () => removeEventListener('message', listener);
  }, [previewId]);

  const source = `/catalogue?ums-artifact=${encodeURIComponent(`${artifact.path}index.html`)}&ums-preview=${encodeURIComponent(previewId)}`;
  const selected = new Set(selectedScopes);
  return <div className="ums-artifact-frame">
    <iframe ref={frame} src={source} title={title} tabIndex={selectionEnabled ? -1 : 0} onLoad={() => {
      const loadedUrl = frame.current?.contentDocument?.URL;
      if (loadedUrl && loadedUrl !== 'about:blank') setFrameLoaded(true);
      bindFrame();
      postContext();
    }} />
    {!frameLoaded && <div className="ums-preview-loading" role="status" aria-live="polite">
      <span className="ums-preview-loading-art" aria-hidden="true" />
      <strong>Loading preview…</strong>
    </div>}
    {selectionEnabled && <div className="ums-selection-layer" data-reveal={revealSelections || undefined} aria-label={`${title} selectable regions`}>
      {regions.map(region => {
        const isSelected = selected.has(region.scope);
        const version = region.capability.sourceBranch === 'branch-a' ? 'A' : 'B';
        const labelPlacement = region.capability.id === 'category-sidebar'
          ? 'inside-bottom'
          : region.top >= 42 ? 'top' : 'below';
        return <motion.button
          type="button"
          key={`${region.capability.id}:${region.scope}`}
          className="ums-selection-region"
          style={{ top: region.top, left: region.left, width: region.width, height: region.height }}
          data-ums-selection-region=""
          data-ums-scope={region.scope}
          data-source-version={version}
          data-label-placement={labelPlacement}
          data-selected={isSelected || undefined}
          aria-pressed={isSelected}
          aria-label={`${isSelected ? 'Remove' : 'Keep'} ${region.visibleLabel}${isSelected ? '' : ` from Version ${version}`}`}
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();
            toggleRef.current?.(region.capability);
          }}
          whileTap={{ scale: .992 }}
        >
          <span className="ums-region-label">
            <i aria-hidden="true">{isSelected ? <Check size={12} strokeWidth={3} /> : null}</i>
            <strong>{selectionLabel(region.capability)}</strong>
            <small>Version {version}</small>
          </span>
        </motion.button>;
      })}
    </div>}
  </div>;
}

function scopeLabel(scope: ShowcaseScope) {
  if (scope.kind === 'feature') return 'Category sidebar';
  return `Quick View · ${catalogueProduct(scope.instanceId)?.name ?? scope.instanceId}`;
}

function pageLabel(pageId: string) {
  if (pageId === 'product-catalogue') return 'Catalogue';
  return pageId
    .split(/[-_]/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function useDialogFocus(close: () => void, opener?: RefObject<HTMLElement | null>) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const returnTarget = opener?.current ?? document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(dialog.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    focusables()[0]?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    addEventListener('keydown', listener);
    return () => {
      removeEventListener('keydown', listener);
      returnTarget?.focus();
    };
  }, []);
  return dialog;
}

function dependencyGroups(paths: string[]) {
  const groups = {
    Components: [] as string[],
    Hooks: [] as string[],
    Styles: [] as string[],
    Types: [] as string[],
    Configuration: [] as string[]
  };
  for (const path of paths) {
    if (path.includes('/hooks/') || /\/use[A-Z]/.test(path)) groups.Hooks.push(path);
    else if (path.endsWith('.css')) groups.Styles.push(path);
    else if (path.includes('/types/')) groups.Types.push(path);
    else if (path.includes('/config/')) groups.Configuration.push(path);
    else if (path.endsWith('.tsx')) groups.Components.push(path);
  }
  return Object.entries(groups).filter(([, items]) => items.length);
}

function EvidenceDialog({ scope, candidate, opener, close }: {
  scope: ShowcaseScope;
  candidate: PublicCandidate;
  opener: RefObject<HTMLElement | null>;
  close: () => void;
}) {
  const [tab, setTab] = useState<EvidenceTab>('overview');
  const evidence = evidenceForScope(scope);
  const product = scope.kind === 'feature-instance' ? catalogueProduct(scope.instanceId) : null;
  const paths = [...new Set([
    ...evidence.supportingFiles.map(item => item.path),
    ...(evidence.configuration ? [evidence.configuration.path] : [])
  ])];
  const closeAndRestore = () => {
    close();
    requestAnimationFrame(() => opener.current?.focus());
  };
  const dependencyCount = paths.length;
  return <Sheet
    open
    onOpenChange={open => { if (!open) closeAndRestore(); }}
    title={scopeLabel(scope)}
    description={`${evidence.branchLabel} · ${evidence.branch}`}
    side={window.innerWidth < 640 ? 'bottom' : 'right'}
  >
    <Tabs value={tab} onValueChange={value => setTab(value as EvidenceTab)} className="flex min-h-0 flex-1 flex-col">
      <TabsList className="mx-4 mt-3 flex rounded-lg bg-white/[.05] p-1" aria-label="Technical evidence">
        {(['overview', 'dependencies', 'integration', 'verification'] as EvidenceTab[]).map(item => <TabsTrigger key={item} value={item}>{item}</TabsTrigger>)}
      </TabsList>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 text-sm">
        <TabsContent value="overview" className="m-0 space-y-6 outline-none">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[.14em] text-white/40">Overview</span>
            <h3 className="mb-1 mt-2 text-xl font-semibold tracking-[-.03em]">{evidence.selectedBoundary}</h3>
            <p className="m-0 text-white/55">{evidence.branchLabel} · <code className="font-mono text-[12px]">{evidence.branch}</code></p>
          </div>
          <dl className="grid gap-3 rounded-lg bg-white/[.05] p-4">
            <div><dt className="mb-1 text-[11px] text-white/40">Source file</dt><dd className="m-0 break-all font-mono text-[12px]">{evidence.sourceFile}:{evidence.sourceLine}</dd></div>
            <div><dt className="mb-1 text-[11px] text-white/40">Source resolved</dt><dd className="m-0 flex items-center gap-2"><Check size={13} className="text-[var(--color-success)]" /> {dependencyCount} required · {evidence.excludedFiles.length} excluded</dd></div>
            {product && <div><dt className="mb-1 text-[11px] text-white/40">Selected target</dt><dd className="m-0">{product.name} · <code className="font-mono text-[12px]">{product.id}</code></dd></div>}
          </dl>
          <div><span className="mb-3 block text-[11px] font-semibold uppercase tracking-[.14em] text-white/40">Dependency summary</span><p className="m-0 leading-6 text-white/65">The selected boundary resolves to {dependencyCount} source files. {evidence.excludedFiles.length} sibling change{evidence.excludedFiles.length === 1 ? ' is' : 's are'} intentionally excluded.</p></div>
        </TabsContent>
        <TabsContent value="dependencies" className="m-0 outline-none">
          <h3 className="mb-4 mt-0 text-sm font-semibold">Required source tree</h3>
          <div className="rounded-lg bg-black/20 p-4 font-mono text-[12px] leading-7">
            <strong className="block text-white">{evidence.sourceFile.split('/').at(-1)}</strong>
            {paths.filter(path => path !== evidence.sourceFile).map((path, index, list) => <span className="block text-white/60" key={path}>{index === list.length - 1 ? '└' : '├'} {path}</span>)}
          </div>
          {dependencyGroups(paths).length > 0 && <div className="mt-5 grid gap-2">{dependencyGroups(paths).map(([group, items]) => <p className="m-0 flex justify-between text-xs text-white/55" key={group}><span>{group}</span><span>{items.length}</span></p>)}</div>}
          <div className="mt-7"><h3 className="mb-3 text-sm font-semibold">Excluded</h3>{evidence.excludedFiles.map(item => <p className="mb-3 mt-0" key={`${item.path}:${item.symbol}`}><code className="block break-all font-mono text-[12px] text-white/70">{item.path}</code><span className="mt-1 block text-xs leading-5 text-white/45">{item.reason}</span></p>)}</div>
        </TabsContent>
        <TabsContent value="integration" className="m-0 outline-none">
          <h3 className="mb-5 mt-0 text-sm font-semibold">Candidate operations</h3>
          <ol className="m-0 grid list-none gap-4 p-0">
            {['Add selected component', 'Add required hooks and configuration', 'Insert source imports', 'Render the selected boundary'].map((label, index) => <li className="flex gap-3" key={label}><span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-[11px]">{index + 1}</span><span className="pt-0.5 text-white/75">{label}</span></li>)}
          </ol>
          <details className="mt-7 rounded-lg bg-white/[.05] p-4"><summary className="cursor-pointer text-xs font-semibold">Show technical details</summary><p className="mb-0 mt-3 break-all font-mono text-[11px] leading-5 text-white/50">candidate {candidate.candidateBranch}<br />commit {candidate.candidateCommit}<br />slice {candidate.sliceIds.join(', ')}</p></details>
        </TabsContent>
        <TabsContent value="verification" className="m-0 outline-none">
          <h3 className="mb-4 mt-0 text-sm font-semibold">Recorded verification</h3>
          <div className="grid gap-2">{candidate.verification.map(gate => <details key={gate.id} className="rounded-lg bg-white/[.05] px-4 py-3 open:bg-white/[.08]"><summary className="flex cursor-pointer list-none items-center justify-between gap-4"><span className="flex items-center gap-2 font-medium"><Check size={14} className="text-[var(--color-success)]" />{gate.purpose}</span><span className="text-[11px] text-white/40">Passed</span></summary><div className="mt-3 border-t border-white/10 pt-3"><code className="block break-all font-mono text-[11px] leading-5 text-white/70">$ {gate.command}</code><p className="mb-0 mt-2 text-xs text-white/45">Exit {gate.exitCode} · {gate.evidenceReference}</p></div></details>)}</div>
        </TabsContent>
      </div>
    </Tabs>
  </Sheet>;
}

function capabilityKindLabel(kind: SelectionCapability['kind']) {
  if (kind === 'whole-feature') return 'Whole feature';
  if (kind === 'feature-instance') return 'Feature instance';
  if (kind === 'all-instances') return 'All instances';
  if (kind === 'configurable-subset') return 'Configurable subset';
  return 'Unsupported selection';
}

function capabilityTargetLabels(capability: SelectionCapability) {
  return (capability.targetIds ?? []).map(id => (
    catalogueProduct(id)?.name ?? id.charAt(0).toUpperCase() + id.slice(1)
  ));
}

function CapabilityDetailsDialog({
  capability,
  close,
  customize
}: {
  capability: SelectionCapability<CatalogueSourceBranch>;
  close: () => void;
  customize?: (opener: HTMLElement) => void;
}) {
  const dialog = useDialogFocus(close);
  const targets = capabilityTargetLabels(capability);
  const configurableChild: SelectionCapability | undefined = catalogueSelectionCapabilities.find(item => (
    item.parentCapabilityId === capability.id && item.kind === 'configurable-subset'
  ));
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} className="capability-dialog" role="dialog" aria-modal="true" aria-labelledby="capability-title">
      <header>
        <div><span>Selection details</span><h2 id="capability-title">{capability.label}</h2></div>
        <button onClick={close} aria-label="Close selection details">×</button>
      </header>
      <dl>
        <div><dt>Selection level</dt><dd>{capabilityKindLabel(capability.kind)}</dd></div>
        <div><dt>Source branch</dt><dd>{capability.sourceBranch === 'branch-a' ? 'Version A' : 'Version B'}</dd></div>
        <div><dt>Original route</dt><dd>{capability.route}</dd></div>
        <div><dt>Workspace</dt><dd>{capability.pageId}</dd></div>
        <div><dt>Availability</dt><dd>{capability.supported ? 'Supported' : 'Not available yet'}</dd></div>
      </dl>
      <section>
        <strong>What will be included</strong>
        <p>{targets.length > 0
          ? targets.join(', ')
          : capability.kind === 'whole-feature'
            ? 'The complete visible feature and its verified dependencies.'
            : 'No independently executable selection is available.'}</p>
      </section>
      {!capability.supported && <section className="capability-unavailable">
        <strong>Why it cannot be added</strong>
        <p>{capability.unsupportedReason}</p>
      </section>}
      {configurableChild && <section className="capability-customize">
        <strong>{configurableChild.label}</strong>
        <p>Choose the categories retained in the result and its permanent default.</p>
        <button onClick={event => {
          close();
          customize?.(event.currentTarget);
        }}>Customize categories</button>
      </section>}
    </section>
  </div>;
}

function CategoryConfigurationDialog({ initial, sidebarSelected, opener, close, apply }: {
  initial: CategorySidebarConfiguration;
  sidebarSelected: boolean;
  opener: RefObject<HTMLElement | null>;
  close: () => void;
  apply: (configuration: CategorySidebarConfiguration) => void;
}) {
  const dialog = useDialogFocus(close, opener);
  const [enabledCategoryIds, setEnabledCategoryIds] = useState<string[]>(initial.enabledCategoryIds);
  const [defaultCategoryId, setDefaultCategoryId] = useState(initial.defaultCategoryId);
  const [showHeading, setShowHeading] = useState(initial.showHeading);
  const [showProductCounts, setShowProductCounts] = useState(initial.showProductCounts);
  let configuration: CategorySidebarConfiguration | null = null;
  let validationMessage = '';
  try {
    configuration = normalizeCategorySidebarConfiguration({ enabledCategoryIds, defaultCategoryId, showHeading, showProductCounts });
  } catch (error) {
    validationMessage = error instanceof CategorySidebarConfigurationRefusal
      ? error.productMessage
      : 'This category configuration cannot be applied.';
  }
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} className="category-configuration-dialog" role="dialog" aria-modal="true" aria-labelledby="category-configuration-title">
      <header>
        <div>
          <span>Version A · /catalogue</span>
          <h2 id="category-configuration-title">Category sidebar</h2>
        </div>
        <button onClick={close} aria-label="Close category customization">×</button>
      </header>
      <fieldset>
        <legend>Categories included</legend>
        {categorySidebarRepositoryMetadata.categories.map(category => <label key={category.id}>
          <input
            type="checkbox"
            checked={enabledCategoryIds.includes(category.id)}
            onChange={event => setEnabledCategoryIds(current => event.target.checked
              ? [...current, category.id]
              : current.filter(id => id !== category.id))}
          />
          <span>{category.label}</span>
        </label>)}
      </fieldset>
      <fieldset>
        <legend>Appearance</legend>
        <label>
          <input type="checkbox" checked={showHeading} onChange={event => setShowHeading(event.target.checked)} />
          <span>Show “Categories” heading</span>
        </label>
        <label>
          <input type="checkbox" checked={showProductCounts} onChange={event => setShowProductCounts(event.target.checked)} />
          <span>Show product counts</span>
        </label>
      </fieldset>
      <fieldset>
        <legend>Default category</legend>
        {categorySidebarRepositoryMetadata.categories
          .filter(category => enabledCategoryIds.includes(category.id))
          .map(category => <label key={category.id}>
            <input
              type="radio"
              name="default-category"
              value={category.id}
              checked={defaultCategoryId === category.id}
              onChange={() => setDefaultCategoryId(category.id)}
            />
            <span>{category.label}</span>
          </label>)}
      </fieldset>
      {validationMessage && <p className="configuration-validation" role="alert">{validationMessage}</p>}
      <footer>
        <button className="secondary-action" onClick={close}>Cancel</button>
        <button
          disabled={!configuration}
          onClick={() => {
            if (!configuration) return;
            apply(configuration);
          }}
        >{sidebarSelected ? 'Save customization' : 'Add customized sidebar'}</button>
      </footer>
    </section>
  </div>;
}

function FoundationControl({ value, change }: {
  value: string;
  change: (branchRef: 'main' | 'branch-a' | 'branch-b' | 'branch-incompatible') => void;
}) {
  return <fieldset className="foundation-control">
    <legend>Start combined result from</legend>
    <div>
      {catalogueFoundationOptions.map(option => <label key={option.branchRef}>
        <input
          type="radio"
          name="integration-foundation"
          value={option.branchRef}
          checked={value === option.branchRef}
          aria-describedby={`foundation-description-${option.branchRef}`}
          onChange={() => change(option.branchRef)}
        />
        <span><strong>{option.label}</strong><small id={`foundation-description-${option.branchRef}`}>{option.description}</small></span>
      </label>)}
      <label className="foundation-experimental">
        <input
          type="radio"
          name="integration-foundation"
          value="branch-incompatible"
          checked={value === 'branch-incompatible'}
          aria-describedby="foundation-description-branch-incompatible"
          onChange={() => change('branch-incompatible')}
        />
        <span><strong>Experimental Product-ID</strong><small id="foundation-description-branch-incompatible">Controlled incompatible-foundation proof.</small></span>
      </label>
    </div>
  </fieldset>;
}

function FoundationEvidenceDialog({ summary, close }: {
  summary: ReturnType<typeof integrationPlanToEvidenceSummary>;
  close: () => void;
}) {
  const dialog = useDialogFocus(close);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} className="capability-dialog foundation-evidence-dialog" role="dialog" aria-modal="true" aria-labelledby="foundation-evidence-title">
      <header><div><span>Integration Plan</span><h2 id="foundation-evidence-title">Foundation · {summary.foundation.label}</h2></div><button onClick={close} aria-label="Close foundation evidence">×</button></header>
      <p>{summary.foundation.description}</p>
      <dl>
        <div><dt>Branch</dt><dd>{summary.foundation.branchRef}</dd></div>
        <div><dt>Pinned commit</dt><dd><code>{summary.foundation.commitSha.slice(0, 12)}</code></dd></div>
        <div><dt>Common ancestor</dt><dd><code>{summary.foundation.commonAncestorCommit.slice(0, 12)}</code></dd></div>
      </dl>
      <section><strong>Explicit additions</strong><p>{summary.groups.flatMap(group => group.rows).length
        ? summary.groups.flatMap(group => group.rows).map(row => `${row.sourceLabel}: ${row.label}${row.details.length ? ` · ${row.details.join(', ')}` : ''}`).join(' — ')
        : 'No features are added from another branch.'}</p></section>
    </section>
  </div>;
}

function FoundationRefusalDialog({ refusal, close }: {
  refusal: IntegrationPlanRefusal;
  close: () => void;
}) {
  const dialog = useDialogFocus(close);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} className="conflict-dialog" role="alertdialog" aria-modal="true" aria-labelledby="foundation-refusal-title">
      <header><div><span>Foundation unchanged</span><h2 id="foundation-refusal-title">Cannot use this foundation</h2></div><button onClick={close} aria-label="Close foundation refusal">×</button></header>
      <p>{refusal.productMessage}</p>
      <div className="conflict-evidence"><strong>Why</strong><p>{refusal.technicalDetail}</p><small>The previous safe Integration Plan and configured result remain available.</small></div>
      <footer><button onClick={close}>Keep previous foundation</button></footer>
    </section>
  </div>;
}

function ConflictDialog({ quickCount, close, remove, inspect, showingEvidence }: {
  quickCount: number;
  close: () => void;
  remove: () => void;
  inspect: () => void;
  showingEvidence: boolean;
}) {
  const dialog = useDialogFocus(close);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} className="conflict-dialog" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
      <header>
        <div><span>Safe refusal · {quickCount + 1} selections</span><h2 id="conflict-title">Cannot combine safely</h2></div>
        <button onClick={close} aria-label="Close conflict review">×</button>
      </header>
      <p>This selection changes the shared product identity contract that Quick View depends on. UI Merge cannot isolate that ownership safely.</p>
      <p className="refusal-outcome">No combined result was produced.</p>
      {showingEvidence && <div className="conflict-evidence">
        <strong>{recordedRefusal.selectedBoundary}</strong>
        <p><code>{recordedRefusal.contractPath}#{recordedRefusal.contractSymbol}</code></p>
        <p>{recordedRefusal.reason}</p>
        <small>{recordedRefusal.manualResolution}</small>
      </div>}
      <footer>
        <button className="secondary-action" onClick={inspect}>{showingEvidence ? 'Hide reason' : 'Why?'}</button>
        <button className="danger-action" onClick={remove}>Change selection</button>
      </footer>
    </section>
  </div>;
}

function PreviewPanel({ preview, title, subtitle, artifact, active, selectionEnabled, revealSelections, context, categoryConfiguration, selectedScopes, foundationBranch, onToggle, onUnsupportedCapability, onDetailsCapability, onCustomizeCategories, onHistoryShortcut, onContextMessage, onEnterPick }: {
  preview: ComparisonPreview;
  title: string;
  subtitle: string;
  artifact: PublicArtifact;
  active: boolean;
  selectionEnabled: boolean;
  revealSelections: boolean;
  context: PreviewContext;
  categoryConfiguration?: CategorySidebarConfiguration | null;
  selectedScopes: string[];
  foundationBranch: string;
  onToggle: (capability: SelectionCapability<CatalogueSourceBranch>) => void;
  onUnsupportedCapability: (capability: SelectionCapability<CatalogueSourceBranch>) => void;
  onDetailsCapability: (capability: SelectionCapability<CatalogueSourceBranch>) => void;
  onCustomizeCategories: (opener: HTMLElement) => void;
  onHistoryShortcut: (action: 'undo' | 'redo') => void;
  onContextMessage: (message: PreviewContextMessage) => void;
  onEnterPick: () => void;
}) {
  const bulkCapability = preview === 'branch-b'
    ? catalogueCapabilityFromRuntime(quickViewAllCapabilityId, 'branch-b')
    : null;
  const bulkSelected = selectedScopes.includes(quickViewAllCapabilityId);
  const bulkIncludedByFoundation = foundationBranch === 'branch-b';
  const sidebarIncludedByFoundation = foundationBranch === 'branch-a';
  return <article className={`ums-preview-card ${active ? 'mobile-active' : ''}`} data-view={preview} aria-label={`${title} preview`}>
    <header className="ums-preview-bar flex min-w-0 items-center justify-between gap-3 px-3">
      <div className="flex min-w-0 items-center gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-[6px] bg-ink text-[10px] font-bold text-white">{preview === 'branch-a' ? 'A' : 'B'}</span><p className="m-0 truncate text-[11px] font-semibold text-ink">{subtitle}</p></div>
      <div className="flex shrink-0 items-center gap-2"><code className="hidden font-mono text-[10px] text-muted sm:block">/catalogue</code>{selectionEnabled && <DropdownMenu trigger={<button className="grid size-7 place-items-center rounded-md text-muted hover:bg-ink/[.05] hover:text-ink" aria-label={`More selection actions for ${title}`}><CircleEllipsis size={15} /></button>}>
        {bulkCapability && <DropdownItem onSelect={() => onToggle(bulkCapability)}>{bulkIncludedByFoundation ? 'Included with Version B' : bulkSelected ? 'Remove Quick View from all products' : 'Keep Quick View for all products'}</DropdownItem>}
        {bulkCapability && <DropdownItem onSelect={() => onDetailsCapability(bulkCapability)}>Inspect Quick View capability</DropdownItem>}
        {preview === 'branch-a' && <DropdownItem onSelect={() => sidebarIncludedByFoundation
          ? onToggle(catalogueCapabilityFromRuntime('category-sidebar', 'branch-a'))
          : onCustomizeCategories(document.activeElement as HTMLElement)}>{sidebarIncludedByFoundation ? 'Included with Version A' : selectedScopes.includes('category-sidebar') ? 'Edit category selection' : 'Customize Category sidebar'}</DropdownItem>}
      </DropdownMenu>}</div>
    </header>
    <div className="ums-artifact-stage min-h-0 bg-white">
      <ArtifactFrame
        artifact={artifact}
        title={`${title} live application`}
        previewId={preview}
        context={context}
        categoryConfiguration={categoryConfiguration}
        selectedScopes={selectedScopes}
        selectionEnabled={selectionEnabled}
        revealSelections={revealSelections}
        visibilitySignal={active}
        resolveCapability={(scope, label) => catalogueCapabilityFromRuntime(scope, preview, label)}
        onToggle={onToggle}
        onUnsupportedCapability={onUnsupportedCapability}
        onDetailsCapability={onDetailsCapability}
        onHistoryShortcut={onHistoryShortcut}
        onContextMessage={onContextMessage}
        onEnterPick={onEnterPick}
      />
    </div>
  </article>;
}

function SelectionChip({ scope, openEvidence, remove, configuration }: {
  scope: ShowcaseScope;
  openEvidence: (scope: ShowcaseScope, opener: HTMLElement) => void;
  remove: (scope: ShowcaseScope) => void;
  configuration?: CategorySidebarConfiguration | null;
}) {
  const [open, setOpen] = useState(false);
  const evidence = evidenceForScope(scope);
  const dependencies = new Set([...evidence.supportingFiles.map(item => item.path), evidence.sourceFile]);
  return <Popover
    open={open}
    onOpenChange={setOpen}
    trigger={<motion.button
      layoutId={`selection-${scopeIdentityKey(scope)}`}
      className="ums-selection-token flex min-w-0 max-w-[260px] items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-xs font-semibold text-ink"
      aria-label={`Inspect ${scopeLabel(scope)} selection`}
    ><span className="grid size-4 shrink-0 place-items-center rounded-full bg-iris text-white"><Check size={10} strokeWidth={3} /></span><span className="truncate">{scopeLabel(scope)}</span><small className="text-[10px] font-bold text-iris">{scope.branch === 'branch-a' ? 'A' : 'B'}</small></motion.button>}
    align="start"
  >
    <div className="flex items-start justify-between gap-4"><div><strong className="block text-sm">{scopeLabel(scope)}</strong><span className="mt-1 block text-xs text-muted">{scope.branch === 'branch-a' ? 'Version A' : 'Version B'}</span></div><button className="grid size-7 place-items-center rounded-md text-muted hover:bg-ink/[.05] hover:text-ink" onClick={() => setOpen(false)} aria-label="Close selection summary"><X size={14} /></button></div>
    <div className="my-3 h-px bg-hairline" />
    <p className="m-0 flex items-center justify-between text-xs"><span className="text-muted">Source resolved</span><span className="flex items-center gap-1 font-medium"><Check size={12} className="text-success" /> {dependencies.size} dependencies</span></p>
    {scope.featureId === 'category-sidebar' && configuration && <p className="mt-3 text-xs leading-5 text-muted">{categoryLabels(configuration.enabledCategoryIds).join(', ')} · Default {categoryLabels([configuration.defaultCategoryId])[0]}</p>}
    <div className="mt-4 flex items-center justify-between"><button className="rounded-md px-2 py-1.5 text-xs font-semibold text-ink hover:bg-ink/[.05]" onClick={event => { setOpen(false); openEvidence(scope, event.currentTarget); }}>Inspect evidence</button><button className="grid size-8 place-items-center rounded-md text-muted hover:bg-danger/10 hover:text-danger" onClick={() => remove(scope)} aria-label={`Remove ${scopeLabel(scope)}`}><Trash2 size={14} /></button></div>
  </Popover>;
}

function VersionTabs({ value, change }: { value: ComparisonPreview; change: (value: ComparisonPreview) => void }) {
  return <nav className="ums-mobile-tabs grid grid-cols-2 rounded-lg bg-ink/[.05] p-1" aria-label="Preview versions">
    {(['branch-a', 'branch-b'] as ComparisonPreview[]).map((item, index) => <button
      key={item}
      className="relative min-h-9 rounded-md text-xs font-semibold"
      aria-pressed={value === item}
      onClick={() => change(item)}
    >{value === item && <motion.span layoutId="version-tab-indicator" className="absolute inset-0 rounded-md bg-raised shadow-sm" transition={{ type: 'spring', stiffness: 340, damping: 34 }} />}<span className="relative z-10">Version {index === 0 ? 'A' : 'B'}</span></button>)}
  </nav>;
}

function StatefulCombineButton({ count, refused, onClick }: { count: number; refused: boolean; onClick: () => void }) {
  return <Button variant={refused ? 'danger' : 'primary'} className="min-w-[118px] whitespace-nowrap" onClick={onClick} aria-label={refused ? 'Review refusal' : `Combine ${count} part${count === 1 ? '' : 's'}`}>
    <motion.span className="flex items-center gap-1.5" layout>{refused ? 'Review refusal' : `Combine ${count}`} <ArrowRight size={14} /></motion.span>
  </Button>;
}

function Comparison({ exit }: { exit: () => void }) {
  const [selectionHistory, dispatchHistory] = useReducer(
    selectionHistoryReducer,
    initialSelectionHistory
  );
  const selection = selectionHistory.present;
  const latestSelection = useRef(selection);
  latestSelection.current = selection;
  const [previewContext, setPreviewContext] = useState(defaultPreviewContext);
  const [previewCapabilities, setPreviewCapabilities] = useState<Record<string, PreviewCapabilities>>({});
  const [contextNotices, setContextNotices] = useState<Record<string, PreviewContextNotice[]>>({});
  const [mobilePreview, setMobilePreview] = useState<ComparisonPreview>('branch-a');
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>('comparison');
  const [combinePhase, setCombinePhase] = useState<'idle' | 'preparing' | 'success'>('idle');
  const [selectionMode, setSelectionMode] = useState(() => new URLSearchParams(window.location.search).get('select') === 'parts');
  const [pickReveal, setPickReveal] = useState(selectionMode);
  const [evidenceScope, setEvidenceScope] = useState<ShowcaseScope | null>(null);
  const [showConflict, setShowConflict] = useState(false);
  const [showConflictEvidence, setShowConflictEvidence] = useState(false);
  const [foundationEvidenceOpen, setFoundationEvidenceOpen] = useState(false);
  const [foundationRefusal, setFoundationRefusal] = useState<IntegrationPlanRefusal | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [capabilityNotice, setCapabilityNotice] = useState<SelectionCapability<CatalogueSourceBranch> | null>(null);
  const [detailsCapability, setDetailsCapability] = useState<SelectionCapability<CatalogueSourceBranch> | null>(null);
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
  const evidenceOpener = useRef<HTMLElement | null>(null);
  const categoryEditorOpener = useRef<HTMLElement | null>(null);
  const lastContextRevision = useRef<Record<string, number>>({});
  const scopes = useMemo(() => selectionScopes(selection), [selection]);
  const previewModel = useMemo(() => integrationPlanToPreviewModel(selection), [selection]);
  const evidenceSummary = useMemo(() => integrationPlanToEvidenceSummary(selection), [selection]);
  const verificationProjection = useMemo(() => integrationPlanToVerificationExpectations(selection), [selection]);
  const generationProjection = useMemo(() => previewModel.refused ? null : integrationPlanToGenerationRequest(selection), [selection, previewModel.refused]);
  const activeCandidate = resolveCatalogueCandidate(candidateKey(selection));
  const planIdentity = cataloguePlanIdentity(selection);
  const refused = previewModel.refused;
  const branchAArtifact = catalogueManifest.artifacts.find(item => item.kind === 'branch-a')!;
  const branchBArtifact = catalogueManifest.artifacts.find(item => item.kind === 'branch-b')!;
  const quickCount = scopes.filter(scope => scope.featureId === 'product-quick-view').length;
  const foundationScopeKeys = previewModel.foundation.branchRef === 'branch-a'
    ? ['category-sidebar']
    : previewModel.foundation.branchRef === 'branch-b'
      ? [...catalogueManifest.productIds.map(id => `product-quick-view:${id}`), quickViewAllCapabilityId]
      : [];
  const selectedScopeKeys = [
    ...scopes.map(scopeKey),
    ...(quickCount === catalogueManifest.productIds.length ? [quickViewAllCapabilityId] : []),
    ...foundationScopeKeys
  ];
  const selectionCount = selection.selections.length;
  const sidebarDecision = categorySidebarDecision(selection);
  const categoryConfigurationSelection = sidebarDecision?.configuration ?? null;
  const configuredPreview = useMemo(() => categoryConfigurationSelection
    ? configuredCategoryPreviewContext(previewContext, categoryConfigurationSelection.configuration)
    : { context: previewContext, notices: [] as PreviewContextNotice[] }, [
      previewContext,
      categoryConfigurationSelection?.identity
    ]);

  const enterPick = (focusFirst = false) => {
    if (workspaceState !== 'comparison') return;
    setSelectionMode(true);
    setPickReveal(true);
    if (focusFirst) requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>('[data-ums-selection-region]')?.focus({ preventScroll: true });
    }));
  };
  const leavePick = () => {
    setSelectionMode(false);
    setPickReveal(false);
  };

  useEffect(() => {
    if (!selectionMode || !pickReveal) return;
    const timer = setTimeout(() => setPickReveal(false), 720);
    return () => clearTimeout(timer);
  }, [selectionMode, pickReveal]);

  useEffect(() => {
    const pickShortcuts = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"], [role="menu"]')) return;
      const target = event.target;
      const typing = target instanceof Element && target.matches('input, textarea, select, [contenteditable="true"]');
      if (event.key === 'Escape' && selectionMode) {
        event.preventDefault();
        leavePick();
        return;
      }
      if (!typing && !event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'p' && !selectionMode) {
        event.preventDefault();
        enterPick(true);
      }
    };
    addEventListener('keydown', pickShortcuts);
    return () => removeEventListener('keydown', pickShortcuts);
  }, [selectionMode, workspaceState]);

  function performHistoryAction(action: 'undo' | 'redo') {
    const available = action === 'undo'
      ? selectionHistory.past.length > 0
      : selectionHistory.future.length > 0;
    if (!available) return;
    dispatchHistory({ type: action });
    setShowConflict(false);
    setShowConflictEvidence(false);
  }

  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const updateViewport = () => {
      const width = Math.round(window.innerWidth);
      const height = Math.round(window.innerHeight);
      if (width < 320 || height < 320) return;
      setPreviewContext(current => ({
        ...current,
        viewport: { width, height }
      }));
    };
    const scheduleViewportUpdate = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateViewport, 80);
    };
    updateViewport();
    addEventListener('resize', scheduleViewportUpdate);
    return () => {
      clearTimeout(resizeTimer);
      removeEventListener('resize', scheduleViewportUpdate);
    };
  }, []);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const action = selectionHistoryShortcut(event);
      if (!action) return;
      const available = action === 'undo'
        ? selectionHistory.past.length > 0
        : selectionHistory.future.length > 0;
      if (!available) return;
      event.preventDefault();
      performHistoryAction(action);
    };
    addEventListener('keydown', listener);
    return () => removeEventListener('keydown', listener);
  }, [selectionHistory.past.length, selectionHistory.future.length]);

  const commitSelection = (
    next: typeof selection,
    label: string,
    offerImmediateUndo = false
  ) => {
    latestSelection.current = next;
    dispatchHistory({
      type: 'commit',
      selection: next,
      label,
      offerImmediateUndo
    });
  };
  const changeFoundation = (branchRef: 'main' | 'branch-a' | 'branch-b' | 'branch-incompatible') => {
    try {
      const result = changeCatalogueFoundation(latestSelection.current, catalogueFoundation(branchRef));
      commitSelection(result.plan, result.announcement);
      setFoundationRefusal(null);
      setShowConflict(false);
    } catch (error) {
      if (error instanceof IntegrationPlanRefusal) {
        setFoundationRefusal(error);
        return;
      }
      throw error;
    }
  };
  const removeScope = (scope: ShowcaseScope) => {
    const current = latestSelection.current;
    const currentQuickCount = selectionScopes(current).filter(item => item.featureId === 'product-quick-view').length;
    let next = showcaseSelectionReducer(current, { type: 'remove-scope', scope });
    if (scope.featureId === 'product-quick-view' && currentQuickCount === 1 && hasIncompatibleProductId(current)) {
      next = showcaseSelectionReducer(next, { type: 'toggle-incompatible' });
      setShowConflict(false);
    }
    commitSelection(next, `Removed ${scopeLabel(scope)}`, true);
  };
  const toggleCapability = (
    branch: CatalogueSourceBranch,
    capability: SelectionCapability<CatalogueSourceBranch>
  ) => {
    const current = latestSelection.current;
    const currentScopes = selectionScopes(current);
    if (!capability.supported || capability.sourceBranch !== branch) {
      setCapabilityNotice(capability);
      return;
    }
    if (foundationIncludesCapability(current, capability.sourceBranch)) {
      const foundationLabel = catalogueFoundationLabels[current.foundation.branchRef as keyof typeof catalogueFoundationLabels];
      setCapabilityNotice({
        ...capability,
        kind: 'unsupported',
        supported: false,
        unsupportedReason: `${capability.label} is already included because ${foundationLabel} is the foundation. To select only part of ${foundationLabel}, start from Main or the other version.`
      });
      return;
    }
    const capabilityScopes = catalogueScopesForCapability(capability);
    if (capabilityScopes.length === 0) {
      setCapabilityNotice({
        ...capability,
        kind: 'unsupported',
        supported: false,
        unsupportedReason: `${capability.label} has no verified source selection.`
      });
      return;
    }
    const alreadySelected = capabilityScopes.every(scope => (
      currentScopes.some(item => scopeIdentityKey(item) === scopeIdentityKey(scope))
    ));
    if (!alreadySelected) {
      const compatibility = selectionCapabilityCompatibility([
        ...currentScopes.map(catalogueCapabilityForScope),
        capability
      ]);
      if (!compatibility.compatible) {
        setCapabilityNotice({
          ...capability,
          kind: 'unsupported',
          supported: false,
          unsupportedReason: compatibility.reason
        });
        return;
      }
    }
    let next = current;
    for (const scope of capabilityScopes) {
      const contains = selectionScopes(next).some(item => scopeIdentityKey(item) === scopeIdentityKey(scope));
      if (alreadySelected || !contains) {
        next = showcaseSelectionReducer(
          next,
          { type: alreadySelected ? 'remove-scope' : 'toggle-scope', scope }
        );
      }
    }
    if (alreadySelected && !hasQuickViewSelection(next) && hasIncompatibleProductId(current)) {
      next = showcaseSelectionReducer(next, { type: 'toggle-incompatible' });
      setShowConflict(false);
    }
    setCapabilityNotice(null);
    const historySubject = capability.id === quickViewAllCapabilityId
      ? 'Quick View to all products'
      : capability.label;
    commitSelection(
      next,
      `${alreadySelected ? 'Removed' : 'Added'} ${historySubject}`,
      alreadySelected
    );
  };
  const openEvidence = (scope: ShowcaseScope, opener: HTMLElement) => {
    evidenceOpener.current = opener;
    setEvidenceScope(scope);
  };
  const clearSelections = () => {
    const current = latestSelection.current;
    const count = current.selections.length;
    commitSelection(
      showcaseSelectionReducer(current, { type: 'clear' }),
      `Cleared ${count} selection${count === 1 ? '' : 's'}`,
      true
    );
    setShowConflict(false);
  };
  const removeIncompatible = () => {
    const current = latestSelection.current;
    commitSelection(
      showcaseSelectionReducer(current, { type: 'toggle-incompatible' }),
      'Removed Product-ID change',
      true
    );
    setShowConflict(false);
    setShowConflictEvidence(false);
  };
  const openCategoryEditor = (opener: HTMLElement) => {
    categoryEditorOpener.current = opener;
    setCategoryEditorOpen(true);
  };
  const applyCategoryConfiguration = (configuration: CategorySidebarConfiguration) => {
    const current = latestSelection.current;
    const addingSidebar = !categorySidebarDecision(current);
    const configured = createCategorySidebarConfigurationSelection(configuration);
    const next = showcaseSelectionReducer(current, {
      type: 'configure-category-sidebar',
      configuration: configured
    });
    commitSelection(next, addingSidebar ? 'Added customized Category sidebar' : 'Customized Category sidebar');
    setCategoryEditorOpen(false);
  };
  const viewCombined = () => {
    if (refused) {
      setShowConflict(true);
      return;
    }
    leavePick();
    setCombinePhase(activeCandidate.verification.every(gate => gate.exitCode === 0) ? 'success' : 'preparing');
    setWorkspaceState('combined');
  };
  const handleContextMessage = (message: PreviewContextMessage) => {
    if (message.type === 'ums-preview-context-ready') {
      setPreviewCapabilities(current => ({
        ...current,
        [message.previewId]: message.capabilities
      }));
      return;
    }
    if (message.type === 'ums-preview-context-changed') {
      const lastRevision = lastContextRevision.current[message.previewId] ?? -1;
      if (message.revision <= lastRevision) return;
      lastContextRevision.current[message.previewId] = message.revision;
      setPreviewContext(current => acceptIntentionalContext(
        current,
        message.context,
        message.revision,
        lastRevision,
        message.fields
      ).context);
      setContextNotices(current => ({ ...current, [message.previewId]: [] }));
      return;
    }
    setContextNotices(current => ({
      ...current,
      [message.previewId]: message.notices
    }));
  };
  const resultChoiceSummary = scopes.map(scope => `${scopeLabel(scope)} · ${scope.branch === 'branch-a' ? 'A' : 'B'}`).join(' + ');
  const selectionRouteGroups = useMemo(() => {
    return evidenceSummary.groups.map(group => ({
      ...group,
      scopes: scopes.filter(scope => scope.route === group.route
        && scope.pageId === group.pageId
        && scope.branch === group.rows[0]?.sourceBranch)
    }));
  }, [evidenceSummary, scopes]);
  const historyLabels = selectionHistory.past.slice(-6).reverse();
  const configuredRuntimeNotices = useMemo((): PreviewContextNotice[] => {
    const productId = configuredPreview.context.catalogue.selectedProductId;
    if (!configuredPreview.context.catalogue.quickViewOpen
      || !productId
      || previewModel.quickViewProductIds.some(id => id === productId)) return [];
    const productName = catalogueProduct(productId)?.name ?? 'the selected product';
    return [{
      code: 'unsupported-quick-view',
      message: `Quick View is not included for ${productName} in this configured result. The product list remains selected.`
    }];
  }, [configuredPreview.context.catalogue.quickViewOpen, configuredPreview.context.catalogue.selectedProductId, previewModel.planIdentity]);
  const activeContextNotices = workspaceState === 'combined'
    ? [...configuredPreview.notices, ...configuredRuntimeNotices, ...(contextNotices.combined ?? [])]
    : (contextNotices[mobilePreview] ?? []).filter(notice => notice.code !== 'unsupported-quick-view');

  return <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 340, damping: 34 }}>
    <main
      className="ums-presentation comparison-shell bg-canvas"
      data-context-ready-count={Object.keys(previewCapabilities).length}
      data-context-category={previewContext.catalogue.categoryId}
      data-context-product={previewContext.catalogue.selectedProductId ?? ''}
      data-context-quick-view={previewContext.catalogue.quickViewOpen}
      data-history-past={selectionHistory.past.length}
      data-history-future={selectionHistory.future.length}
      data-integration-plan-id={planIdentity}
      data-preview-plan-id={previewModel.planIdentity}
      data-generation-plan-id={generationProjection?.planIdentity ?? 'refused'}
      data-verification-plan-id={verificationProjection.planIdentity}
      data-evidence-plan-id={evidenceSummary.planIdentity}
      data-historical-artifact-required="false"
      data-selection-mode={selectionMode}
      data-interaction-mode={selectionMode ? 'pick' : 'try'}
      data-workspace-state={workspaceState}
    >
      <header className="ums-global-bar sticky top-0 z-40 flex h-[50px] items-center gap-2 border-b border-hairline bg-surface px-2.5 sm:px-4">
        <Tooltip label="Back to landing"><button onClick={exit} className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-[13px] font-semibold hover:bg-canvas" aria-label="UI Merge Studio home"><span className="grid size-7 shrink-0 place-items-center rounded-md bg-ink text-[9px] font-black text-white">UM</span><span className="hidden sm:block">UI Merge Studio</span></button></Tooltip>
        <span className="hidden h-5 w-px bg-hairline sm:block" />
        <Popover align="start" trigger={<button className="flex min-h-8 items-center gap-1.5 rounded-md px-2 font-mono text-[11px] text-muted hover:bg-canvas hover:text-ink" aria-label={`Foundation ${evidenceSummary.foundation.label}`}><GitBranch size={13} /><span className="sm:hidden">{selection.foundation.branchRef}</span><span className="hidden sm:inline">{selection.foundation.branchRef} · {evidenceSummary.foundation.commitSha.slice(0, 7)}</span><ChevronDown size={12} /></button>}>
          <div className="mb-3"><span className="text-[11px] font-semibold uppercase tracking-[.14em] text-muted">Foundation</span><p className="mb-0 mt-1 text-sm font-semibold">Shared base used to create the candidate.</p></div>
          <FoundationControl value={selection.foundation.branchRef} change={changeFoundation} />
          <button className="mt-3 text-xs font-semibold text-ink" onClick={() => setFoundationEvidenceOpen(true)}>Inspect foundation evidence</button>
        </Popover>
        <div className="ml-auto flex items-center gap-1.5">
          <Tooltip label="Runs from recorded, validated artifacts."><button className="hidden min-h-8 items-center gap-1.5 rounded-md px-2 text-[11px] text-muted hover:bg-canvas sm:flex" aria-label="Controlled replay information"><span className="size-1.5 rounded-full bg-success" />Controlled replay</button></Tooltip>
          {workspaceState === 'comparison' && <span className={`ums-mode-status hidden text-[11px] font-semibold sm:inline-flex ${selectionMode ? 'text-iris' : 'text-muted'}`}>{selectionMode ? 'Pick mode' : 'Try mode'}</span>}
          {workspaceState === 'comparison' ? <Button
            variant={selectionMode ? 'secondary' : 'primary'}
            size="sm"
            className="ums-pick-control min-w-[112px] max-sm:min-w-0"
            data-active={selectionMode || undefined}
            aria-pressed={selectionMode}
            aria-label={selectionMode ? 'Return to Try mode' : 'Pick parts'}
            onClick={() => selectionMode ? leavePick() : enterPick(false)}
          >{selectionMode ? <><span className="ums-pick-active-dot" aria-hidden="true" /><MousePointer2 size={14} /> Pick mode <Kbd className="hidden sm:inline-flex">Esc</Kbd></> : <><MousePointer2 size={14} /> Pick parts</>}</Button> : <Button variant="ghost" size="sm" onClick={() => setWorkspaceState('comparison')}><ArrowLeft size={14} /> Compare again</Button>}
          <DropdownMenu trigger={<button className="grid size-8 place-items-center rounded-md text-muted hover:bg-canvas hover:text-ink" aria-label="More workspace actions"><CircleEllipsis size={16} /></button>}>
            {selectionHistory.past.length > 0 && <DropdownItem onSelect={() => performHistoryAction('undo')}><RotateCcw size={14} /> Undo <Kbd className="ml-auto">⌘Z</Kbd></DropdownItem>}
            {selectionHistory.future.length > 0 && <DropdownItem onSelect={() => performHistoryAction('redo')}><RotateCcw size={14} className="-scale-x-100" /> Redo</DropdownItem>}
            <DropdownItem onSelect={() => setHistoryOpen(true)}><History size={14} /> Selection history</DropdownItem>
            {selectionCount > 0 && <DropdownItem onSelect={clearSelections}><Trash2 size={14} /> Clear selections</DropdownItem>}
            <DropdownSeparator />
            <DropdownItem onSelect={() => commitSelection(
              showcaseSelectionReducer(selection, { type: 'toggle-incompatible' }),
              hasIncompatibleProductId(selection) ? 'Removed Product-ID change' : 'Added Product-ID change',
              hasIncompatibleProductId(selection)
            )}>{hasIncompatibleProductId(selection) ? <Check size={14} /> : <Info size={14} />} Experimental Product-ID change</DropdownItem>
            <DropdownSeparator />
            <DropdownItem onSelect={() => window.open(githubUrl, '_blank', 'noopener,noreferrer')}>GitHub</DropdownItem>
          </DropdownMenu>
        </div>
      </header>

      <AnimatePresence initial={false} mode="popLayout">
        {workspaceState === 'comparison' ? <motion.section key="comparison" className="ums-compare-workspace flex h-[calc(100vh-50px)] min-h-[520px] flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-label="Compare versions">
          <VersionTabs value={mobilePreview} change={setMobilePreview} />
          <section className="ums-preview-grid flex-1" aria-label="Side-by-side implementation comparison">
            <PreviewPanel preview="branch-a" title="Version A" subtitle="branch-sidebar" artifact={branchAArtifact} active={mobilePreview === 'branch-a'} selectionEnabled={selectionMode} revealSelections={pickReveal} context={configuredPreview.context} categoryConfiguration={categoryConfigurationSelection?.configuration} selectedScopes={selectedScopeKeys} foundationBranch={selection.foundation.branchRef} onToggle={capability => toggleCapability('branch-a', capability)} onUnsupportedCapability={setCapabilityNotice} onDetailsCapability={setDetailsCapability} onCustomizeCategories={openCategoryEditor} onHistoryShortcut={performHistoryAction} onContextMessage={handleContextMessage} onEnterPick={() => enterPick(true)} />
            <PreviewPanel preview="branch-b" title="Version B" subtitle="branch-inspector" artifact={branchBArtifact} active={mobilePreview === 'branch-b'} selectionEnabled={selectionMode} revealSelections={pickReveal} context={previewContext} selectedScopes={selectedScopeKeys} foundationBranch={selection.foundation.branchRef} onToggle={capability => toggleCapability('branch-b', capability)} onUnsupportedCapability={setCapabilityNotice} onDetailsCapability={setDetailsCapability} onCustomizeCategories={openCategoryEditor} onHistoryShortcut={performHistoryAction} onContextMessage={handleContextMessage} onEnterPick={() => enterPick(true)} />
          </section>
          <AnimatePresence>{selectionMode && pickReveal && <motion.div className="ums-pick-instruction" role="status" aria-live="polite" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>Pick a part to keep</motion.div>}</AnimatePresence>
        </motion.section> : <motion.section key="result" className="ums-result-workspace flex h-[calc(100vh-50px)] min-h-[560px] flex-col gap-3 px-3 pb-3 pt-4 sm:px-5 sm:pb-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} aria-labelledby="result-title">
          <header className="ums-result-heading text-center">
            <h1 id="result-title" className="m-0 text-[clamp(1.6rem,3vw,2.25rem)] font-semibold leading-none tracking-[-.045em]">Combined result</h1>
            <div className="mb-1 mt-2 flex flex-wrap items-center justify-center gap-1.5" aria-label="Selected parts in result">{scopes.length ? scopes.map((scope, index) => <span className="contents" key={scopeIdentityKey(scope)}>
              {index > 0 && <i className="not-italic text-muted" aria-hidden="true">+</i>}
              <motion.button layoutId={`selection-${scopeIdentityKey(scope)}`} className="ums-result-choice inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-ink" onClick={() => removeScope(scope)} aria-label={`Remove ${scopeLabel(scope)}`}><span className="size-1.5 rounded-full bg-iris" />{scopeLabel(scope)} · {scope.branch === 'branch-a' ? 'A' : 'B'}</motion.button>
            </span>) : <span className="text-sm font-semibold">{resultChoiceSummary || `${selectionCount} selected parts`}</span>}</div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${combinePhase === 'success' ? 'text-success' : 'text-muted'}`}>{combinePhase === 'success' ? <ShieldCheck size={14} /> : null}{combinePhase === 'success' ? 'Verified' : 'Status unknown'}</span>
          </header>
          <div className="ums-result-frame min-h-0 flex-1 overflow-hidden rounded-lg border border-hairline bg-white shadow-frame">
            <ConfiguredCatalogueFrame
              model={previewModel}
              title="Combined result application"
              context={configuredPreview.context}
              onCategoryChange={categoryId => setPreviewContext(current => ({ ...current, catalogue: { ...current.catalogue, categoryId } }))}
              onQuickViewChange={(productId, open) => setPreviewContext(current => ({ ...current, catalogue: { ...current.catalogue, selectedProductId: productId, quickViewOpen: open } }))}
              onHistoryShortcut={performHistoryAction}
            />
          </div>
          <ShowcaseResultSummary candidate={activeCandidate} selectionCount={selectionCount} onEvidence={scopes[0] ? () => openEvidence(scopes[0], document.activeElement as HTMLElement) : undefined} />
        </motion.section>}
      </AnimatePresence>

      <AnimatePresence>{activeContextNotices.length > 0 && <motion.aside className="ums-glass fixed bottom-24 left-1/2 z-50 w-[min(520px,calc(100%-24px))] -translate-x-1/2 rounded-lg px-4 py-3 text-xs text-ink" role="status" aria-live="polite" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>{activeContextNotices.map(notice => <p className="m-0" key={`${notice.code}:${notice.message}`}>{notice.message}</p>)}</motion.aside>}</AnimatePresence>
      <AnimatePresence>{capabilityNotice && <motion.aside className="ums-glass fixed right-4 top-16 z-50 flex max-w-[420px] items-start gap-4 rounded-lg p-4 text-sm" role="status" aria-live="polite" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}><div><strong>{capabilityNotice.label} cannot be selected independently.</strong><p className="mb-0 mt-1 text-xs leading-5 text-muted">{capabilityNotice.unsupportedReason}</p></div><button className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-ink/[.05]" onClick={() => setCapabilityNotice(null)} aria-label="Dismiss selection explanation"><X size={14} /></button></motion.aside>}</AnimatePresence>

      <AnimatePresence>{workspaceState === 'comparison' && selectionCount > 0 && <motion.aside
        className="ums-selection-island fixed bottom-4 left-1/2 z-50 flex min-h-[56px] max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-2 rounded-xl p-2 pl-3 shadow-float"
        aria-label="Current selections"
        role="complementary"
        initial={{ opacity: 0, y: 20, scale: .98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: .98 }}
      >
        <div className="ums-selection-island-tokens flex min-w-0 items-center gap-1.5">{scopes.slice(0, 2).map(scope => <SelectionChip key={scopeIdentityKey(scope)} scope={scope} configuration={'configuration' in scope ? scope.configuration?.configuration ?? null : null} openEvidence={openEvidence} remove={removeScope} />)}</div>
        {scopes.length > 2 && <DropdownMenu align="start" trigger={<button className="min-h-8 rounded-md px-2 text-xs font-semibold text-muted hover:bg-ink/[.05]">+{scopes.length - 2}</button>}>{scopes.map(scope => <DropdownItem key={scopeIdentityKey(scope)} onSelect={() => removeScope(scope)}><Check size={13} className="text-iris" />{scopeLabel(scope)}<Trash2 size={13} className="ml-auto text-muted" /></DropdownItem>)}</DropdownMenu>}
        <span className="hidden h-6 w-px bg-hairline sm:block" />
        <DropdownMenu align="end" trigger={<button className="whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium text-muted hover:bg-ink/[.05]" aria-label={`Review ${selectionCount} selected part${selectionCount === 1 ? '' : 's'}`}>{selectionCount} picked</button>}>
          {scopes.map(scope => <DropdownItem key={scopeIdentityKey(scope)} onSelect={() => openEvidence(scope, document.activeElement as HTMLElement)}><Check size={13} className="text-iris" />Inspect {scopeLabel(scope)}</DropdownItem>)}
          <DropdownSeparator />
          <DropdownItem onSelect={clearSelections} danger><Trash2 size={13} />Clear selections</DropdownItem>
        </DropdownMenu>
        <StatefulCombineButton count={selectionCount} refused={refused} onClick={viewCombined} />
      </motion.aside>}</AnimatePresence>

      <AnimatePresence>{selectionHistory.undoPrompt && <motion.div className="ums-history-feedback ums-glass fixed bottom-[84px] right-4 z-[52] flex items-center gap-3 rounded-lg px-3 py-2 text-xs shadow-float" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} role="status"><span>{selectionHistory.undoPrompt}</span><button className="rounded-md border-0 bg-transparent px-2 py-1 font-semibold text-ink hover:bg-ink/[.05]" onClick={() => performHistoryAction('undo')}>Undo</button></motion.div>}</AnimatePresence>

      <p className="sr-only" role="status" aria-live="polite">{selectionHistory.announcement || (refused ? 'Cannot combine the selected Product-ID change with Quick View. Safe selections are preserved.' : `${selectionCount} selections. Result ready.`)}</p>
    {evidenceScope && <EvidenceDialog scope={evidenceScope} candidate={resolveCatalogueCandidate(candidateKey(selection))} opener={evidenceOpener} close={() => setEvidenceScope(null)} />}
    {detailsCapability && <CapabilityDetailsDialog capability={detailsCapability} close={() => setDetailsCapability(null)} customize={openCategoryEditor} />}
    {categoryEditorOpen && <CategoryConfigurationDialog
      initial={categoryConfigurationSelection?.configuration ?? completeCategorySidebarConfiguration}
      sidebarSelected={Boolean(sidebarDecision)}
      opener={categoryEditorOpener}
      close={() => setCategoryEditorOpen(false)}
      apply={applyCategoryConfiguration}
    />}
    {showConflict && <ConflictDialog quickCount={quickCount} close={() => setShowConflict(false)} remove={removeIncompatible} inspect={() => setShowConflictEvidence(value => !value)} showingEvidence={showConflictEvidence} />}
    {foundationEvidenceOpen && <FoundationEvidenceDialog summary={evidenceSummary} close={() => setFoundationEvidenceOpen(false)} />}
    {foundationRefusal && <FoundationRefusalDialog refusal={foundationRefusal} close={() => setFoundationRefusal(null)} />}
    <Sheet open={historyOpen} onOpenChange={setHistoryOpen} title="Selection history" description="The latest reversible decisions in this comparison.">
      <div className="flex-1 overflow-y-auto p-5" role="region" aria-label="Selection history">
        {historyLabels.length === 0 ? <p className="text-sm text-white/60">No selection actions yet.</p> : <ol className="m-0 grid list-none gap-2 p-0">{historyLabels.map((entry, index) => <li className="rounded-lg border border-white/10 bg-white/[.04] px-3 py-2.5 text-sm" key={`${selectionHistory.past.length - index}:${entry.label}`}>{entry.label}</li>)}</ol>}
        {selectionHistory.future.length > 0 && <p className="mt-4 text-xs text-white/55">{selectionHistory.future.length} action{selectionHistory.future.length === 1 ? '' : 's'} available to redo.</p>}
      </div>
    </Sheet>
    </main>
  </MotionConfig>;
}

export function CatalogueShowcase() {
  const [view, setView] = useState<View>(() => new URLSearchParams(location.search).get('view') === 'compare' ? 'compare' : 'landing');
  const navigate = (next: View) => {
    history.pushState({ catalogueView: next }, '', next === 'compare' ? '?mode=showcase&view=compare' : '?mode=showcase');
    setView(next);
  };
  useEffect(() => {
    const listener = (event: PopStateEvent) => setView(event.state?.catalogueView === 'compare' ? 'compare' : 'landing');
    addEventListener('popstate', listener);
    return () => removeEventListener('popstate', listener);
  }, []);
  return view === 'landing' ? <PublicLanding open={() => navigate('compare')} /> : <Comparison exit={() => navigate('landing')} />;
}
