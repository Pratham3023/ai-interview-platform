import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        autoRewrite: true,
        proxyTimeout: 60000,   // 60s — Gemini LLM calls can be slow
        timeout: 60000,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'lucide-react', 'react-hot-toast'],
          editor: ['@monaco-editor/react'],
          charts: ['recharts']
        }
      }
    }
  }
})
