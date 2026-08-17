import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const localShared = path.resolve(__dirname, './src/shared/index.ts');
const monorepoShared = path.resolve(__dirname, '../packages/shared/src/index.ts');
const sharedPath = fs.existsSync(localShared) ? localShared : monorepoShared;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
