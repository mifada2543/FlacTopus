#!/usr/bin/env bash
# ============================================================
# scan-secrets.sh — Pemindai secret sederhana untuk FlacTopus
# Mendeteksi API key / file .env / kunci privat yang ter-commit
# SEBELUM di-commit atau di-push.
#
# Pemakaian:
#   bash scripts/scan-secrets.sh            # scan semua file yang di-track git
#   bash scripts/scan-secrets.sh --staged   # scan file yang baru di-staged (pre-commit)
#
# Exit code: 0 = bersih, 1 = ditemukan potensi secret
#
# Whitelist per baris: tambahkan komentar "# noscan" di akhir baris
# untuk mengecualikan baris tersebut dari pemeriksaan.
# ============================================================

set -uo pipefail

MODE="${1:-all}"

# Pastikan dijalankan di dalam repo git (hindari hasil "bersih" palsu di folder lain)
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "⛔ Bukan direktori repo git. Jalankan script ini dari dalam FlacTopus."
    exit 1
fi

# Kumpulan file yang akan diperiksa
if [ "$MODE" = "--staged" ]; then
    FILES=$(git diff --cached --name-only --diff-filter=ACM -z | tr '\0' '\n')
else
    FILES=$(git ls-files -z | tr '\0' '\n')
fi

if [ -z "$FILES" ]; then
    echo "✅ Scan secret bersih: tidak ada file untuk diperiksa ($MODE)."
    exit 0
fi

# File yang dikecualikan (artefak build, dependensi, dsb.)
# - dist/ & assets/  : hasil build sudah di-gitignore (baik di root maupun frontend/),
#                      dan pre-commit hook memblokir index.html hasil build. File
#                      minified bisa memicu false-positive pola secret.
# - scan-secrets.sh  : script ini sendiri (pola regex-nya bukan secret).
EXCLUDE='(^|/)node_modules/|(^|/)dist/|^assets/|^\.git/|^scripts/scan-secrets\.sh$|(^|/)package-lock\.json$|\.min\.(js|css)$)'

# Nilai placeholder yang dianggap AMAN (bukan secret sungguhan)
PLACEHOLDER='your_|_here|xxx|changeme|CHANGE_ME|example|placeholder|\.\.\.|REPLACE'

FAILED=0

check_pattern() {
    local desc="$1" pattern="$2"
    local hits
    hits=$(echo "$FILES" | grep -vE "$EXCLUDE" | xargs -r -d '\n' grep -nE "$pattern" 2>/dev/null | grep -v '# noscan')
    if [ -n "$hits" ]; then
        echo "❌ [$desc] — kemungkinan secret ditemukan:"
        echo "$hits" | head -10
        echo
        FAILED=1
    fi
}

# ── 1. File .env ter-commit (hanya .env.example yang diizinkan) ──
ENV_FILES=$(echo "$FILES" | grep -E '(^|/)\.env(\.|$)' | grep -vE '\.env\.example$')
if [ -n "$ENV_FILES" ]; then
    echo "❌ [File .env ter-commit] — file .env tidak boleh masuk git:"
    echo "$ENV_FILES"
    echo
    FAILED=1
fi

# ── 2. Pola API key & token umum ──
check_pattern "API key Google (AIza...)" 'AIza[0-9A-Za-z_\-]{35}'
check_pattern "API key OpenAI (sk-...)" 'sk-[A-Za-z0-9_-]{20,}'
check_pattern "AWS Access Key (AKIA...)" 'AKIA[0-9A-Z]{16}'
check_pattern "Token GitHub (ghp_/gho_/dst.)" 'gh[pousr]_[0-9A-Za-z]{36,}'
check_pattern "Token Slack (xox...)" 'xox[baprs]-[A-Za-z0-9-]{10,}'
check_pattern "Kunci privat (BEGIN ... PRIVATE KEY)" '-----BEGIN [A-Z ]*PRIVATE KEY-----'

# ── 3. Assignment variabel *_API_KEY / *SECRET / *TOKEN / *PASSWORD ──
ASSIGN_HITS=$(echo "$FILES" | grep -vE "$EXCLUDE" | xargs -r -d '\n' grep -nE \
    '[A-Z_0-9]+(API[_-]?KEY|SECRET|TOKEN|PASSWORD)[[:space:]]*[:=][[:space:]]*["'"'"']?[^"'"'"'[:space:]#]+' 2>/dev/null \
    | grep -vE 'import\.meta\.env|process\.env|\$\{[A-Z_]*\}|\.env\.[A-Za-z]+' \
    | grep -viE "$PLACEHOLDER" \
    | grep -v '# noscan')
if [ -n "$ASSIGN_HITS" ]; then
    echo "❌ [Variabel secret bernilai nyata] — nilai bukan placeholder:"
    echo "$ASSIGN_HITS" | head -10
    echo
    FAILED=1
fi

# ── Hasil ──
if [ "$FAILED" -ne 0 ]; then
    echo "⛔ Scan secret GAGAL — perbaiki temuan di atas sebelum commit/push."
    echo "   (baris yang memang aman bisa ditandai '# noscan' di akhir baris)"
    exit 1
fi

echo "✅ Scan secret bersih: tidak ada potensi secret ditemukan ($MODE)."
exit 0
