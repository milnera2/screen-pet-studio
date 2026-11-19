import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Cargo creates and locks executable build artifacts here while Tauri runs.
      // They are not frontend inputs and must not be watched by Vite on Windows.
      ignored: ['**/src-tauri/**'],
    },
  },
});
