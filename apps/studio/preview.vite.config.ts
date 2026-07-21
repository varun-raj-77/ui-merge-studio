import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { detectFixtureCapabilities } from '../../packages/preview-runtime/src/fixtureAdapter';
import { reactSourceInstrumentation } from '../../packages/source-instrumentation/src/vitePlugin';

const repositoryRoot = process.env.UI_MERGE_PREVIEW_ROOT;
const branch = process.env.UI_MERGE_PREVIEW_BRANCH;
const studioOrigin = process.env.UI_MERGE_STUDIO_ORIGIN;
const previewId = process.env.UI_MERGE_PREVIEW_ID;
const sessionId = process.env.UI_MERGE_PREVIEW_SESSION_ID;
const generation = Number(process.env.UI_MERGE_PREVIEW_GENERATION);
if (!repositoryRoot || !branch || !studioOrigin || !previewId || !sessionId || !Number.isInteger(generation) || generation < 1) throw new Error('Preview root, branch, Studio origin, and valid session identity are required.');
const capabilities = await detectFixtureCapabilities(repositoryRoot);
export default defineConfig({
  root: repositoryRoot,
  plugins: [reactSourceInstrumentation({ repositoryRoot, branch, studioOrigin, identity: { previewId, sessionId, generation, branch }, capabilities }), react()]
});
