import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), glsl()],
  server: {
    port: 3000,
    hmr: true,
    watch: {
      usePolling: true, // utile si Docker/WSL
    },
  },
})
