import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import vueDevTools from 'vite-plugin-vue-devtools';

const backendProxyTarget = process.env.ZEV2_BACKEND_PROXY_TARGET ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [vue(), vueJsx(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@zev2/shared': fileURLToPath(new URL('../packages/shared/src/index.ts', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': backendProxyTarget
    }
  }
});
