import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split big, rarely-changing vendor libraries into their own long-cached
        // chunks so the app (index) chunk stays small and a code change doesn't
        // bust the vendor cache. exceljs is already dynamically imported, so it is
        // left to its own async chunk (return undefined = default behaviour).
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('exceljs')) return;
          if (/[\\/]react-router/.test(id)) return 'vendor-react';
          if (/[\\/]react-dom[\\/]/.test(id) || /[\\/]react[\\/]/.test(id) || /[\\/]scheduler[\\/]/.test(id)) return 'vendor-react';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('lucide-react')) return 'vendor-icons';
          return 'vendor';
        },
      },
    },
  },
})
