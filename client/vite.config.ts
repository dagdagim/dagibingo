import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const localShared = path.resolve(__dirname, './src/shared/index.ts');
const monorepoShared = path.resolve(__dirname, '../packages/shared/src/index.ts');
const sharedPath = fs.existsSync(localShared) ? localShared : monorepoShared;

// Plugin to automatically clone index.html into 404.html for SPA static hosting (Render/GitHub Pages/Surge)
const generate404Plugin = () => ({
  name: 'generate-404-html',
  closeBundle() {
    const distPath = path.resolve(__dirname, 'dist');
    const indexPath = path.join(distPath, 'index.html');
    const notFoundPath = path.join(distPath, '404.html');
    if (fs.existsSync(indexPath)) {
      fs.copyFileSync(indexPath, notFoundPath);
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), generate404Plugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@bingo/shared': sharedPath,
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
      },
    },
  },
});
