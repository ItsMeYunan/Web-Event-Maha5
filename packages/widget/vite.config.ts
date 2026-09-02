import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Read the repo-root .env so the bot and this frontend share one file.
  // Only VITE_-prefixed vars are exposed to the browser (Vite's envPrefix default).
  envDir: '../..',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
  },
});
