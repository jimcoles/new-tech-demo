import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/

export default defineConfig ({
  root: "src",
  base: "/",
  plugins: [react()],
  optimizeDeps: {
    exclude: ["ref"]
  },
  build: {

  }
})
