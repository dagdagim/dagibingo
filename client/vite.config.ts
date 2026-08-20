import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const localShared = path.resolve(__dirname, './src/shared/index.ts');
const monorepoShared = path.resolve(__dirname, '../packages/shared/src/index.ts');
const sharedPath = fs.existsSync(localShared) ? localShared : monorepoShared;

// Plugin to automatically clone index.html into 404.html, 200.html and route subdirectories for SPA static hosting (Render/Vercel/GitHub Pages)
const generateSPARoutesPlugin = () => ({
  name: 'generate-spa-routes',
  closeBundle() {
    const distPath = path.resolve(__dirname, 'dist');
    const indexPath = path.join(distPath, 'index.html');
    if (!fs.existsSync(indexPath)) return;

    const htmlContent = fs.readFileSync(indexPath, 'utf-8');

    // 404.html & 200.html fallbacks
    fs.writeFileSync(path.join(distPath, '404.html'), htmlContent);
    fs.writeFileSync(path.join(distPath, '200.html'), htmlContent);

    // Pre-create route directories with index.html for direct link loading
    const routes = [
      'chickenroad',
      'towers',
      'limbo',
      'greyhound',
      'horserace',
      'mines',
      'aviator',
      'keno',
      'plinko',
      'lobby',
      'wallet',
      'login',
      'register',
      'dashboard',
      'leaderboard',
      'history',
      'profile',
      'how-it-works',
      'faq',
    ];

    for (const route of routes) {
      const routeDir = path.join(distPath, route);
      if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
      }
      fs.writeFileSync(path.join(routeDir, 'index.html'), htmlContent);
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), generateSPARoutesPlugin()],
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
