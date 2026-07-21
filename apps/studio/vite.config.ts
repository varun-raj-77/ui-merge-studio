import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({ root: import.meta.dirname, plugins: [react()], build: { outDir: resolve(import.meta.dirname, 'dist'), emptyOutDir: true }, test: { environment: 'jsdom', globals: true, setupFiles: resolve(import.meta.dirname, '../../tests/setup.ts') } });

