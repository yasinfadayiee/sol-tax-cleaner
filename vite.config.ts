import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves the project under /<repo>/; override with BASE_PATH for a custom domain.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/sol-tax-cleaner/',
  plugins: [react()],
})
