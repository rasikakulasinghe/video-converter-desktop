import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true, // Don't fallback to other ports
    host: '127.0.0.1', // Explicit localhost for security
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false, // Disable sourcemaps for production builds
    minify: 'esbuild', // Faster minification
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  // Desktop app optimizations
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  clearScreen: false, // Don't clear console in dev mode
})