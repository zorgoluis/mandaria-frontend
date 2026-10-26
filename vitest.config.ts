import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  test: {
    // Bound concurrent jsdom/App instances; preserve all tests and their deadlines.
    maxWorkers: 4,
    include: ['src/test/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    env: { VITE_API_URL: 'http://localhost:3000' },
    clearMocks: true,
  },
})
