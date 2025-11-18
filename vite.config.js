import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use a simple base path for local development to fix asset loading issues.
  base: '/',
  build: {
    rollupOptions: {
      // Externalize dependencies loaded via importmap to prevent bundling.
      external: [
        'firebase/compat/app',
        'firebase/compat/auth',
        'firebase/compat/firestore',
        'jszip',
        'jspdf',
        'exceljs',
      ],
    },
  },
});