import { randomBytes } from 'node:crypto';
import type { Plugin } from 'vite';
import { createSelectionRuntimeSource } from '../../preview-runtime/src/runtimeSource';
import type { PreviewCapabilities, PreviewIdentity } from '../../shared/src/bridge';
import { instrumentReactSource } from './instrumentReactSource';

const runtimeId = '\0ui-merge-studio:selection-runtime';
export function reactSourceInstrumentation(options: { repositoryRoot: string; branch: string; studioOrigin: string; identity: PreviewIdentity; capabilities: PreviewCapabilities }): Plugin {
  const receiptByBoundary = new Map<string, string>();
  const selectionReceipt = (boundaryId: string) => {
    const existing = receiptByBoundary.get(boundaryId);
    if (existing) return existing;
    const receipt = `rendered-${randomBytes(24).toString('base64url')}`;
    receiptByBoundary.set(boundaryId, receipt);
    return receipt;
  };
  const instrumentationToken = process.env.UI_MERGE_INSTRUMENTATION_TOKEN;
  if (!instrumentationToken) throw new Error('A private preview instrumentation token is required.');
  return {
    name: 'ui-merge-studio-react-source-instrumentation',
    apply: 'serve',
    enforce: 'pre',
    async transform(code, id) {
      const result = instrumentReactSource(code, id, {
        ...options,
        selectionReceipt: metadata => selectionReceipt(metadata.boundaryId)
      });
      if (!result) return null;
      const response = await fetch(`${options.studioOrigin}/api/internal/previews/${options.identity.previewId}/instrumentation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${instrumentationToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ preview: options.identity, boundaries: result.boundaries })
      });
      if (!response.ok) throw new Error(`Studio refused trusted preview instrumentation (${response.status}): ${await response.text()}`);
      return { code: result.code, map: result.map };
    },
    resolveId(id) { return id === '/@ui-merge-studio/selection-runtime' ? runtimeId : null; },
    load(id) { return id === runtimeId ? createSelectionRuntimeSource({ identity: options.identity, studioOrigin: options.studioOrigin, capabilities: options.capabilities }) : null; },
    transformIndexHtml: { order: 'pre', handler() { return [{ tag: 'script', attrs: { type: 'module', src: '/@ui-merge-studio/selection-runtime' }, injectTo: 'head' }]; } }
  };
}
