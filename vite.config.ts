import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // Research R8: precache everything, no runtime caching, and no skipWaiting,
    // so a new version starts once all app windows are closed.
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'script',
      strategies: 'generateSW',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,ttf,webmanifest}'],
        navigateFallback: 'index.html',
        runtimeCaching: [],
      },
      manifest: {
        name: 'Planer posiłków',
        short_name: 'Planer',
        lang: 'pl',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        theme_color: '#2f6f4f',
        background_color: '#ffffff',
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
