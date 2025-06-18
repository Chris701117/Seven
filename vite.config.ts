// vite.config.ts (最終統一版)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // 我們不再指定 root，讓 vite 從專案根目錄運作
  plugins: [react()],
  build: {
    // 我們將輸出目錄標準化為 'dist'，這是最常見的設定
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