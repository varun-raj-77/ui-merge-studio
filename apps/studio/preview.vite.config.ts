import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { reactSourceInstrumentation } from '../../packages/source-instrumentation/src/vitePlugin';
const repositoryRoot = process.env.UI_MERGE_PREVIEW_ROOT;
const branch = process.env.UI_MERGE_PREVIEW_BRANCH;
const studioOrigin = process.env.UI_MERGE_STUDIO_ORIGIN;
if (!repositoryRoot || !branch || !studioOrigin) throw new Error('Preview root, branch, and Studio origin environment are required.');
export default defineConfig({ root: repositoryRoot, plugins: [reactSourceInstrumentation({ repositoryRoot, branch, studioOrigin }), react()] });
