// vite.config.ts (最終統一版)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: './client', 
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'), 
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
})