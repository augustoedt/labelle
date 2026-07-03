import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    port: 3001,
  },
  plugins: [tsconfigPaths(), tanstackStart(), viteReact()],
})
