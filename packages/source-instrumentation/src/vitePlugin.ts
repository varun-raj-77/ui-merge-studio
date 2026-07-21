import type { Plugin } from 'vite';
import { createSelectionRuntimeSource } from '../../preview-runtime/src/runtimeSource';
import type { PreviewCapabilities, PreviewIdentity } from '../../shared/src/bridge';
import { instrumentReactSource } from './instrumentReactSource';

const runtimeId = '\0ui-merge-studio:selection-runtime';
export function reactSourceInstrumentation(options: { repositoryRoot: string; branch: string; studioOrigin: string; identity: PreviewIdentity; capabilities: PreviewCapabilities }): Plugin {
  return {
    name: 'ui-merge-studio-react-source-instrumentation',
    apply: 'serve',
    enforce: 'pre',
    transform(code, id) { return instrumentReactSource(code, id, options); },
    resolveId(id) { return id === '/@ui-merge-studio/selection-runtime' ? runtimeId : null; },
    load(id) { return id === runtimeId ? createSelectionRuntimeSource({ identity: options.identity, studioOrigin: options.studioOrigin, capabilities: options.capabilities }) : null; },
    transformIndexHtml: { order: 'pre', handler() { return [{ tag: 'script', attrs: { type: 'module', src: '/@ui-merge-studio/selection-runtime' }, injectTo: 'head' }]; } }
  };
}
