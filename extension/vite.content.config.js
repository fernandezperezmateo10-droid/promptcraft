import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  build: {
    emptyOutDir: false,
    outDir: 'dist',
    lib: {
      entry: 'src/content.jsx',
      name: 'ContentScript',
      formats: ['iife'],
      fileName: () => 'content.js'
    },
    rollupOptions: {
      output: {
        assetFileNames: 'content.[ext]'
      }
    }
  }
})
