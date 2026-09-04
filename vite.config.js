import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deployed on Vercel → assets must be at domain root
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: { port: 5173 }
});
