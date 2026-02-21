import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      'react-icons/lib/index.mjs': 'react-icons/lib/index.js',
      'es-toolkit/compat': path.resolve(__dirname, 'src/shims/es-toolkit/compat'),
      'es-toolkit': path.resolve(__dirname, 'src/shims/es-toolkit/index.js'),
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['**/node_modules/**', 'e2e/**/*'],
    pool: 'threads',
  },
})
