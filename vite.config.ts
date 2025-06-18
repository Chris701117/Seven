// vite.config.ts (最終統一版)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // 我們不再需要 root 設定，讓 vite 從專案根目錄運作
  plugins: [react()],
  build: {
    // 標準化輸出目錄為 'dist'
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      // 由於 root 是根目錄，這裡的路徑也需要對應調整
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
})