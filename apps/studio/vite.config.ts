import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

function artifactReplayRoute() {
  const rewrite = (request: { url?: string }, _response: unknown, next: () => void) => {
    if (request.url) {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/catalogue') request.url = `/showcase-frame.html${url.search}`;
    }
    next();
  };
  return {
    name: 'artifact-replay-route',
    configureServer(server: { middlewares: { use: (handler: typeof rewrite) => void } }) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server: { middlewares: { use: (handler: typeof rewrite) => void } }) {
      server.middlewares.use(rewrite);
    }
  };
}

export default defineConfig({
  root: import.meta.dirname,
  plugins: [artifactReplayRoute(), react()],
  build: { outDir: resolve(import.meta.dirname, 'dist'), emptyOutDir: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: resolve(import.meta.dirname, '../../tests/setup.ts')
  }
});
