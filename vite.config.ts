import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    css: true,
    testTimeout: 15000,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
});
