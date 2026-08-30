import { defineConfig } from 'vite';

export default defineConfig(({mode})=>({
  base: './',
  build: { rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } }, chunkSizeWarningLimit: 1600 },
  server: { port: 5173, strictPort: true, hmr: mode !== 'qa' },
}));
