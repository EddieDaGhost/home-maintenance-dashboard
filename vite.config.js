import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Static single-page app. `npm run build` writes to dist/, which is what Vercel serves.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
