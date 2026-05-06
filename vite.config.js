import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',

      // 🔹 Activos estáticos que se incluyen en el build PWA
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'icons/*.png'
      ],

      // 🔹 Manifest PWA — aquí está la “app-like experience”
      manifest: {
        name: 'MiFinanza',
        short_name: 'MiFinanza',
        description: 'Finanzas familiares personales',
        theme_color: '#4f7cff',
        background_color: '#f4f6fb',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },

      // 🔹 Workbox: cache de assets, pero SIN romper Supabase
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',

        runtimeCaching: [
          // ✅ Google Fonts cacheados (ejemplo)
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
              }
            }
          },

          // ✅ Static CDN (si algún día usas uno)
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 días
              }
            }
          },

          // 🚫 Supabase: NO cache, NO intercept — clave para auth
          {
            urlPattern: ({ url }) => url.origin.includes('supabase.co'),
            handler: 'NetworkOnly',
            options: {
              cacheName: 'supabase-direct',
            }
          }
        ]
      },

      // 🔹 Comportamiento del SW en desarrollo
      devOptions: {
        enabled: false,          // ❗ SW desactivado en dev (evita locuras)
        type: 'module'
      }
    })
  ],

  build: {
    target: 'esnext'
  }
})