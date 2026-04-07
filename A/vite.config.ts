import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  // Bump the target to es2022 so top-level await is supported.
  // mupdf uses TLA in its distributed bundle.
  esbuild: {
    target: 'es2022',
  },
  // Don't pre-bundle mupdf. We load it lazily via dynamic import,
  // and Vite's scanner chokes on its TLA + node:fs imports.
  optimizeDeps: {
    exclude: ['mupdf'],
    esbuildOptions: {
      target: 'es2022',
    },
  },
  // Production build target also needs to support TLA.
  build: {
    target: 'es2022',
  },
});
