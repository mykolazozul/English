import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vercel serves from domain root
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: { port: 5173 }
});
