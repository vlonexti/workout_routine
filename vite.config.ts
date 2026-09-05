import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: './' keeps the build working on a custom domain (justloofy.dev)
// AND on the default github.io/<repo>/ URL.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', assetsDir: 'assets' },
})
