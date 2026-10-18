import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { templateCompilerOptions } from '@tresjs/core'
import path from 'path'

export default defineConfig({
  plugins: [
    vue({
      ...templateCompilerOptions,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8888,
    open: '/#/demo4',
    proxy: {
      '/gemini-proxy': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/gemini-proxy/, ''),
      },
      '/wiki-proxy': {
        target: 'https://zh.wikipedia.org',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/wiki-proxy/, ''),
        headers: {
          'User-Agent': 'MikuDataV/1.0 (DigitalHuman; miku@sc-datav.org)',
        },
      },
    },
  },
  optimizeDeps: {
    include: ['d3-geo'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          echarts: ['echarts'],
          vendor: ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
})
