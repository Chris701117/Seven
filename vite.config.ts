// vite.config.ts (最終修正版)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // ✅ 我們將 root 設定加回來，明確告訴 Vite 前端專案的家在 'client' 資料夾
  root: './client', 
  plugins: [react()],
  build: {
    // ✅ 輸出路徑是相對於 root 的，所以 'dist' 會被建立在專案根目錄下
    outDir: '../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      // 由於 root 是 client，這裡的路徑要從 client/src 開始
      '@': path.resolve(__dirname, './client/src'), 
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
})