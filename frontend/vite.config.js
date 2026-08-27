import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/FlacTopus/',
  // Hasil build (JS/CSS) ditempatkan di folder 'node-assets' (di-root project)
  // agar tidak bercampur dengan 'assets/' milik halaman PHP (Bootstrap/Tailwind/htmx).
  build: {
    assetsDir: 'node-assets',
  },
  server: {
    // Dev mode: panggilan API autentikasi (auth/*.php) diteruskan ke Apache,
    // karena PHP hanya jalan lewat Apache/MySQL (bukan server Vite).
    proxy: {
      '/FlacTopus/auth': 'http://localhost',
      '/FlacTopus/backend': 'http://localhost',
    },
  },
  plugins: [react()],
})
