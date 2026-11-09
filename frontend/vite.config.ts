import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: /api so‘rovlari FastAPI (localhost:8000) ga yo‘naltiriladi
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8000' } },
});
