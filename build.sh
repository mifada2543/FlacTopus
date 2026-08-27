#!/usr/bin/env bash
# ============================================================
# build.sh — Build produksi frontend lalu salin hasil ke root
# (Workflow lokal XAMPP/LAMPP: /opt/lampp/htdocs/FlacTopus)
# ============================================================
# Alur:
#   1. cd frontend && npm run build    → menghasilkan frontend/dist/
#   2. cp frontend/dist/index.html     → index.html (root)
#   3. cp frontend/dist/node-assets/*  → node-assets/ (root)
#
# Kenapa 'node-assets'? Folder 'assets/' di root dipakai untuk aset statis
# halaman PHP (Bootstrap/Tailwind/htmx) + favicon/ikon (assets/img/).
# Hasil build React (Vite) diletakkan terpisah di 'node-assets/' agar tidak
# tercampur.
#
# Favicon & ikon: sumber resminya ada di assets/img/ (favicon.svg,
# icons.svg) — build TIDAK lagi menyalinnya ke root (dulu dari
# frontend/public/). index.html mengacu /assets/img/favicon.svg.
#
# Apache menyajikan root project di:
#   http://localhost/FlacTopus/
#
# ⚠️ PENTING (keamanan):
#   - index.html & node-assets/ di ROOT adalah HASIL BUILD (di-gitignore)
#     — jangan pernah di-commit.
#   - Sumber aplikasi yang benar ada di folder frontend/.
#   - Setelah mengubah kode di frontend/src, jalankan ulang: bash build.sh
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

echo "▶ 1/3 Menjalankan vite build (frontend)..."
( cd frontend && npm run build )

echo "▶ 2/3 Menyalin index.html hasil build ke root..."
cp frontend/dist/index.html index.html

echo "▶ 3/3 Menyalin bundle JS/CSS ke node-assets/ (root)..."
rm -rf node-assets
mkdir -p node-assets
cp -r frontend/dist/node-assets/. node-assets/

# Bersihkan artefak favicon lama di root (sejak kini sumbernya di assets/img/)
rm -f favicon.svg icons.svg

echo "✅ Selesai! Aplikasi siap di http://localhost/FlacTopus/"
echo "⚠️  index.html & node-assets/ di root adalah hasil build — JANGAN di-commit."
