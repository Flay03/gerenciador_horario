import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANTE: Mude a linha abaixo para o nome do seu repositório no GitHub.
  // Exemplo: se a URL for https://seu-usuario.github.io/meu-projeto/,
  // a base deve ser '/meu-projeto/'.
  base: '/gerenciador-horario/', 
  build: {
    rollupOptions: {
      // Externalize dependencies loaded via importmap to prevent bundling.
      external: [
        /^firebase\/.*/, // Regex to match all firebase imports like 'firebase/app', 'firebase/auth', etc.
        'jszip',
        'jspdf',
        'exceljs',
      ],
    },
  },
});
