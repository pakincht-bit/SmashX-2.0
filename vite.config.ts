import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'lucide': ['lucide-react'],
          'supabase': ['@supabase/supabase-js'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['lucide-react', '@supabase/supabase-js']
  }
});