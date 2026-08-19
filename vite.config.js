import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    /**
     * The tool works with no signal. That isn't a nice-to-have: a craft room is often
     * the room with the worst wifi in the house, and the whole app is client-side
     * anyway — no image is ever uploaded, so there is nothing a network could add.
     * Precache the shell only; never let a fixture image into the manifest.
     */
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'stitch-grid',
        short_name: 'stitch-grid',
        description: 'Turn a photo into a crochet chart.',
        theme_color: '#1d2023',
        background_color: '#faf8f5',
        display: 'standalone',
        start_url: '/',
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
