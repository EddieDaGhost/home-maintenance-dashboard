import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Static single-page app. `npm run build` writes to dist/, which is what Vercel serves.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    // The whole app is cached on first visit, so tapping a tag works with no
    // signal at all — which is the normal state of a chicken coop, a basement
    // laundry room, or anywhere with thick walls. Without this, an NFC tap out
    // of range gets a Safari error page instead of the task list.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [],
      workbox: {
        // Everything the app is made of — it's small enough to hold entirely.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // index.html goes through the network first so a new deploy lands on
        // the next load, falling back to the cached copy when offline.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        name: 'Home Maintenance',
        short_name: 'Home',
        description: 'A shared checklist for the house, opened by NFC stickers on the wall.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f1f5f9',
        theme_color: '#0f172a',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
