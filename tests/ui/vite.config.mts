import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))
export default defineConfig({
  root: path('./harness'),
  plugins: [react()],
  resolve: { alias: {
    'next/navigation': path('./harness/navigation.ts'),
    'next/link': path('./harness/link.tsx'),
    '@': path('../../src'),
  } },
  server: { host: '127.0.0.1', port: 4175, strictPort: true, fs: { allow: [path('../../')] } },
})
