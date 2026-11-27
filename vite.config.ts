import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-router')) return 'router'
          if (id.includes('@tanstack') || id.includes('react-query')) return 'query'
          if (id.includes('node_modules/motion') || id.includes('node_modules\\motion')) return 'motion'
          if (id.includes('radix-ui') || id.includes('@radix-ui')) return 'radix'
          if (id.includes('react-dom') || id.includes('node_modules/react/') || id.includes('node_modules\\react\\')) return 'react'
          return undefined
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
