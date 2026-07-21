import type { Plugin } from 'vite';
import { createSelectionRuntimeSource } from '../../preview-runtime/src/runtimeSource';
import { instrumentReactSource } from './instrumentReactSource';

const runtimeId = '\0ui-merge-studio:selection-runtime';
export function reactSourceInstrumentation(options: { repositoryRoot: string; branch: string; studioOrigin: string }): Plugin {
  return {
    name: 'ui-merge-studio-react-source-instrumentation',
    apply: 'serve',
    enforce: 'pre',
    transform(code, id) { return instrumentReactSource(code, id, options); },
    resolveId(id) { return id === '/@ui-merge-studio/selection-runtime' ? runtimeId : null; },
    load(id) { return id === runtimeId ? createSelectionRuntimeSource(options.branch, options.studioOrigin) : null; },
    transformIndexHtml: { order: 'pre', handler() { return [{ tag: 'script', attrs: { type: 'module', src: '/@ui-merge-studio/selection-runtime' }, injectTo: 'head' }]; } }
  };
}
