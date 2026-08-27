# backend/

**PHP = backend murni** — autentikasi, otorisasi (RBAC), dan logika bisnis
ruangan/silabus dilayani oleh PHP; React (frontend) hanya menggambar UI dan
memanggil API JSON.

## Struktur

```
backend/
├── controller/
│   ├── api/                  # Endpoint API publik (boleh diakses web)
│   │   ├── ruangan.php       # CRUD ruangan, gabung, kelola murid, silabus
│   │   ├── quiz.php          # Submit kuis, analytics, chat history, anti-cheat
│   │   ├── admin.php         # Kelola user, ruangan, activity log (admin only)
│   │   ├── gemini.php        # Backend proxy Gemini API (API key server-side)
│   │   ├── nilai-input.php   # Input nilai
│   │   └── .htaccess         # Izinkan akses *.php di folder ini
│   ├── logic/                # Logika bisnis (DIBLOKIR akses langsung oleh .htaccess)
│   │   ├── RuanganLogic.php  # CRUD ruangan, RBAC, syllabus, members
│   │   ├── LoginRegisterLogic.php # Register, login, session, logout
│   │   ├── RateLimiter.php   # Dual rate limiting (IP + session)
│   │   ├── ActivityLogger.php # Audit trail
│   │   ├── GarbageCollector.php # Auto-clean data sampah
│   │   └── autoloader.php    # Autoloader internal
│   └── .htaccess             # Blokir *.php (kecuali api/)
├── .htaccess                 # Blokir akses langsung ke backend
└── README.md                 # Dokumen ini

auth/                         # (di root project, di luar backend/)
├── config.php                # DB, session, API key (gitignored)
├── config.example.php        # Template config
├── auth.php                  # require_auth, CSRF, session hijacking
├── login.php                 # POST login + rate limiter
├── register.php              # POST register (role=student, status=pending)
├── session.php               # GET session check + CSRF token
├── logout.php                # POST logout + clear session ID
└── .htaccess                 # Blokir config.php

scripts/
├── gc.php                    # Garbage Collector CLI
└── scan-secrets.sh           # Pre-commit secret scanning
```

---

## 🔧 PHP CLI Scripts

Semua script ini **hanya bisa dijalankan dari terminal** (PHP CLI),
bukan dari browser. Jika diakses lewat browser → 403 Forbidden.

### 1. Database Migration

```bash
# Jalankan dari root project
php db/migration.php
```

**Apa yang dilakukan:**
- Membuat database `project_lomba` jika belum ada
- Membuat/mengupdate tabel: users, ruangan, class_members, syllabus,
  quiz_attempts, login_attempts, activity_log, schema_version
- Idempotent — bisa dijalankan berulang kali tanpa error
- Version-based — lacak versi di tabel `schema_version`
- Tidak menghapus data yang ada

**Output contoh:**
```
╔══════════════════════════════════════════════════╗
║  FlacTopus — Database Migration                 ║
╚══════════════════════════════════════════════════╝

✅ Koneksi ke database 'project_lomba' berhasil.
📌 Versi database saat ini: v3
✅ Database sudah versi terbaru (v3).
```

**Kapan harus dijalankan:**
- Pertama kali setup project
- Setelah pull update dari git yang menambah tabel/kolom baru
- Saat error "table doesn't exist" di browser

---

### 2. Garbage Collector

```bash
# Jalankan dari root project
php scripts/gc.php
```

**Apa yang dibersihkan:**

| Data | Retensi | Keterangan |
|------|---------|------------|
| `activity_log` | 90 hari | Hapus record lama |
| `login_attempts` | 1 jam | Backup dari RateLimiter |
| `users.last_session_id` | — | Clear untuk user non-active |
| `storage/chat/` | — | Hapus folder user/room yang sudah dihapus dari DB |
| `storage/ruangan/` | — | Hapus file silabus untuk room yang sudah dihapus |
| `.tmp files` | 1 jam | Sisa write gagal |

**Anti double-run:** Interval minimum 1 jam via file timestamp.

**Output contoh:**
```
╔══════════════════════════════════════════════════╗
║  FlacTopus — Garbage Collector                   ║
╚══════════════════════════════════════════════════╝

✅ Koneksi ke database 'project_lomba' berhasil.

📊 Hasil Garbage Collection:
──────────────────────────────────────────────────
  activity_log         → 0 records deleted (>90 days)
  login_attempts       → 0 records deleted (> 1 hour old)
  stale_session_ids    → 0 users cleared
  orphaned_chats       → 0 room folders deleted
  orphaned_syllabus    → 0 files deleted
  temp_files           → 0 .tmp files cleaned
──────────────────────────────────────────────────
⏱️  Durasi: 1ms
```

**Otomatis berjalan:**
GC juga dijalankan otomatis oleh `auth/config.php` saat ada HTTP request
(max 1x per jam). Script CLI berguna untuk:
- Manual trigger saat pertama kali setup
- Cron job di production: `0 * * * * cd /path && php scripts/gc.php`

---

### 3. Secret Scanning

```bash
# Jalankan dari root project
bash scripts/scan-secrets.sh
```

**Apa yang dilakukan:**
- Scan seluruh project untuk mencari API keys, passwords, tokens yang
  tidak sengaja ter-commit
- Berguna sebagai pre-commit hook

---

## 🌐 API Endpoints

Semua endpoint diakses oleh React (frontend) via `fetch()`.
**Wajib login** (kecuali `session.php`).
**POST wajib header `X-CSRF-Token`** (diambil dari `session.php`).

### Auth (`auth/*.php`)

| Endpoint | Method | Deskripsi |
| --- | --- | --- |
| `auth/session.php` | GET | Cek status login + ambil CSRF token |
| `auth/login.php` | POST | Login (email + password) + dual rate limiter |
| `auth/register.php` | POST | Register (name, email, password) → role=student, status=pending |
| `auth/logout.php` | POST | Logout + clear session ID + activity logging |

### Ruangan (`backend/controller/api/ruangan.php`)

| Aksi | Method | Role | Deskripsi |
| --- | --- | --- | --- |
| `list` | GET | Semua (login) | Daftar ruangan (admin lihat **SEMUA**) |
| `create` | POST | teacher/admin | Buat ruangan baru |
| `join` | POST | student/admin | Gabung via kode 6 karakter |
| `delete` | POST | pemilik + admin | Hapus ruangan permanen |
| `rename` | POST | pemilik + admin | Ubah nama ruangan |
| `kick` | POST | pemilik + admin | Keluarkan murid |
| `set_admin` | POST | pemilik + admin | Atur ketua kelas |
| `toggle_mark` | POST | pemilik + admin | Tandai murid |
| `toggle_pin` | POST | pemilik + admin | Pin murid |
| `touch` | POST | anggota + admin | Reset timer |
| `members` | GET | pemilik + ketua + admin | Detail ruangan + daftar anggota |
| `syllabus` | GET/POST | anggota + pemilik + admin | Baca/simpan skill tree |
| `heartbeat` | POST | anggota + admin | Keep-alive |

### Quiz (`backend/controller/api/quiz.php`)

| Aksi | Method | Role | Deskripsi |
| --- | --- | --- | --- |
| `submit` | POST | student | Submit jawaban kuis |
| `analytics` | GET | pemilik + ketua + admin | Analitik kelas |
| `analytics_trend` | GET | pemilik + ketua + admin | Tren nilai |
| `analytics_participation` | GET | pemilik + ketua + admin | Partisipasi murid |
| `analytics_leaderboard` | GET | pemilik + ketua + admin | Leaderboard |
| `analytics_mistakes` | GET | pemilik + ketua + admin | Soal sering salah |
| `analytics_cheating` | GET | pemilik + ketua + admin | Deteksi pindah tab |
| `student_progress` | GET | student | Progress murid |
| `save_chat` | POST | anggota | Simpan chat AI ke JSON |
| `chat_history` | GET | pemilik + admin | Riwayat chat murid |

### Admin (`backend/controller/api/admin.php`)

| Aksi | Method | Role | Deskripsi |
| --- | --- | --- | --- |
| `list` | GET | admin | Daftar semua user + filter |
| `stats` | GET | admin | Statistik user per role & status |
| `room_stats` | GET | admin | Statistik ruangan + detail |
| `activity_logs` | GET | admin | Audit trail + filter + pagination |
| `activity_stats` | GET | admin | Statistik activity log |
| `approve` | POST | admin | Setujui user pending → active |
| `reject` | POST | admin | Tolak user pending → rejected |
| `change_role` | POST | admin | Ubah role user |
| `delete` | POST | admin | Hapus user permanen |
| `reset_password` | POST | admin | Reset password user |
| `kick` | POST | admin | Keluarkan anggota dari ruangan |

### AI Proxy (`backend/controller/api/gemini.php`)

| Aksi | Method | Role | Deskripsi |
| --- | --- | --- | --- |
| `socratic_feedback` | POST | Semua (login) | Bimbingan Socratic AI untuk murid |
| `generate_skill_tree` | POST | teacher/admin | Generate silabus dari topik/PDF |
| `chat_teacher` | POST | teacher/admin | Chat dengan asisten guru |
| `chat_student` | POST | student | Chat dengan asisten murid |

> **Catatan:** API key Gemini tidak pernah dikirim ke frontend.
> Semua request AI diproxy lewat backend PHP.

---

## 🔒 Keamanan Backend

| Layer | Implementasi |
| --- | --- |
| **Autentikasi** | Session PHP (`FlacTopus` cookie, httponly, secure, SameSite=Lax) |
| **CSRF** | Token `X-CSRF-Token` di header (wajib untuk semua POST) |
| **RBAC** | Multi-level: `isOwner()` → `isOwnerOrSystemAdmin()` → `require_role_json()` |
| **Rate Limiting** | IP-based (login 5/15min, register 3/1hr) + session-based (5 gagal → lock 5min) |
| **Session Hijacking** | Cek `last_session_id` di DB setiap request API |
| **Activity Logging** | Semua aksi dicatat: login, logout, register, admin actions |
| **Input Validation** | Prepared statements (PDO), password hash (bcrypt), email validation |
| **File Protection** | `.htaccess` blokir akses langsung ke `logic/`, config, storage |
