import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    // WICHTIG: Hier muss exakt dein Repo-Name stehen, in Slashes eingefasst!
    base: mode === 'production' ? '/hr-app/' : '/',
  }
})