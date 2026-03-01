import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Use absolute paths for assets when deployed with Express backend
  // This fixes MIME type errors when frontend is served by Express backend
  base: '/',
})
