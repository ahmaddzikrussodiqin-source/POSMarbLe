import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Use relative paths for assets - this fixes MIME type errors
  // when frontend is served by Express backend in subdirectory or proxy
  base: './',
})
