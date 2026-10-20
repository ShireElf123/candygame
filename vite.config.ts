import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function serviceWorkerPrecachePlugin(): Plugin {
  return {
    name: 'jam-shift-service-worker-precache',
    apply: 'build',
    writeBundle(outputOptions, bundle) {
      const appAssets = Object.keys(bundle)
        .filter(fileName => fileName.startsWith('assets/') && !fileName.endsWith('.map'))
        .sort();
      if (!appAssets.length) throw new Error('No built app assets were found for service-worker precaching.');

      const serviceWorkerPath = resolve(outputOptions.dir ?? 'dist', 'sw.js');
      const serviceWorker = readFileSync(serviceWorkerPath, 'utf8');
      const placeholder = 'const PRECACHE_ASSETS = [];';
      if (!serviceWorker.includes(placeholder)) {
        throw new Error('The service-worker precache placeholder is missing from public/sw.js.');
      }

      const precachedWorker = serviceWorker.replace(
        placeholder,
        `const PRECACHE_ASSETS = ${JSON.stringify(appAssets)};`,
      );
      writeFileSync(serviceWorkerPath, precachedWorker);
    },
  };
}

export default defineConfig({
  define: {
    'import.meta.env.VERCEL_ENV': JSON.stringify(process.env.VERCEL_ENV ?? ''),
  },
  plugins: [react(), serviceWorkerPrecachePlugin()],
  base: './',
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app'],
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app'],
  },
  build: {
    outDir: process.env.APPDEPLOY_VITE_OUT_DIR || 'dist',
    sourcemap: process.env.APPDEPLOY_VITE_SOURCEMAP === 'hidden' ? 'hidden' : false,
    rollupOptions: { maxParallelFileOps: 128 },
  },
});
