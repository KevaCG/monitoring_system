import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',        // importante para Netlify
  build: {
    outDir: 'dist'
  }
})
