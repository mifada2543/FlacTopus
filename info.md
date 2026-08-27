# 📋 Deskripsi Project — OSCAR 3.0 Web Development

**Judul:** Sistem Pendidikan Adaptif "Rainforest of Innovation"
**Lomba:** OSCAR 3.0 x GDGOC STT NF — Web Development Competition
**Deadline:** 30 Agustus 2026, 21.00 WIB
**Babak Final:** 6 September 2026, STT Terpadu Nurul Fikri

---

## 🌿 Tentang Project

Project ini adalah **sistem pendidikan adaptif bertenaga AI** yang memetakan pemahaman murid layaknya *Skill Tree* dalam game RPG. Setiap murid memiliki peta belajar visual interaktif berbentuk graf nodes & edges (dibangun dengan ReactFlow), di mana mereka harus menyelesaikan materi secara berurutan — mirip menyelesaikan quest di game.

Fitur unggulan utama adalah **Socratic AI Tutor** yang ditenagai Google Gemini: saat murid mengerjakan kuis, AI bertanya balik secara dialogis (bukan sekadar koreksi jawaban), menuntun murid menemukan jawaban sendiri melalui pertanyaan Socrates.

---

## 🎯 Masalah yang Dijawab

| Masalah | Solusi |
| --- | --- |
| Guru sulit memetakan pemahaman individual murid | Skill Tree visual — guru lihat progress tiap node |
| Belajar tidak adaptif (satu materi untuk semua) | AI tutor Gemini mendeteksi kesalahan & menjelaskan dengan pendekatan berbeda per murid |
| Materi statis, tidak interaktif | Editor guru drag-and-drop untuk membangun skill tree sendiri |
| Tidak ada mekanisme evaluasi berkelanjutan | Kuis interaktif (pilihan ganda + isi rumpang) terintegrasi di setiap node |

---

## 🏗️ Arsitektur & Teknologi

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  React + Vite + React Router + ReactFlow + TailwindCSS  │
│  Pages: Landing, Login, Register, ClassDashboard,       │
│         TeacherDashboard (Editor Skill Tree),            │
│         StudentDashboard (Skill Tree Viewer),            │
│         Quiz, RoomDetail, AdminPanel, ErrorPage          │
│         (401/403/404/429/500)                           │
├─────────────────────────────────────────────────────────┤
│                   BACKEND (PHP Murni)                    │
│  API JSON: auth/login.php, register.php, session.php,   │
│            ruangan.php, admin.php, nilai-input.php       │
│  Logic: LoginRegisterLogic, RuanganLogic, RateLimiter,  │
│         ActivityLogger                                   │
├─────────────────────────────────────────────────────────┤
│                     DATABASE (MySQL)                     │
│  Tables: users, ruangan, class_members, syllabus,        │
│          login_attempts, activity_log, schema_version    │
│  + File JSON per ruangan di storage/ruangan/<id>.json    │
├─────────────────────────────────────────────────────────┤
│                    AI (Google Gemini)                     │
│  Socratic AI Tutor — menuntun murid lewat dialog        │
│  via frontend/src/utils/aiService.js                     │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Teknologi | Keterangan |
| --- | --- | --- |
| Frontend | React 18 + Vite | SPA dengan React Router v6 |
| Visualisasi Skill Tree | ReactFlow (@xyflow/react) | Drag-and-drop nodes & edges |
| UI | Inline styles + CSS custom properties | Dark theme, glass-panel, responsive |
| AI Tutor | Google Gemini API | Socratic questioning approach |
| Backend | PHP murni (tanpa framework) | API JSON, session-based auth |
| Database | MySQL (MariaDB via XAMPP) | 7 tabel + file JSON silabus |
| Keamanan | CSRF, session hijack detection, dual rate limiter, activity log, RBAC, .htaccess | Berdasarkan referensi MEeL |
| Build | Vite build → bash build.sh → XAMPP htdocs | |
| Linting | OxLint | Cepat, ringan |
| CI/CD | GitHub Actions | Secret scanning |
| Migrasi | db/migration.php (CLI-only) | Version-based, idempotent |

---

## 📁 Struktur Project

```
Project_lomba/
├── frontend/                  # React app (Vite)
│   ├── src/
│   │   ├── pages/             # Landing, Login, Register, ClassDashboard,
│   │   │                      # TeacherDashboard, StudentDashboard, Quiz,
│   │   │                      # RoomDetail, AdminPanel (3 tabs), ErrorPage
│   │   ├── components/        # ProtectedRoute (RBAC gate)
│   │   ├── hooks/             # useAuth (session PHP), useRoomHeartbeat
│   │   ├── utils/             # api.js, roles.js, aiService.js (Gemini)
│   │   ├── data/              # mockData.js (template silabus fallback)
│   │   ├── App.jsx            # Route definitions + RBAC matrix
│   │   └── index.css          # CSS variables, dark theme, responsive, animations
│   ├── vite.config.js         # base: '/Project_lomba/'
│   └── .env.example           # VITE_GEMINI_API_KEY template
├── auth/                      # PHP auth backend
│   ├── config.php             # DB, session config, security headers (gitignored)
│   ├── auth.php               # require_auth, session hijacking check, CSRF helpers
│   ├── login.php              # POST API login + dual rate limiter
│   ├── register.php           # POST API register (role=student, status=pending)
│   ├── session.php            # GET session check + CSRF token
│   ├── logout.php             # POST logout + activity logging
│   └── config.example.php     # Template config (committed)
├── backend/controller/
│   ├── api/
│   │   ├── ruangan.php        # CRUD ruangan (create, join, delete, syllabus, etc.)
│   │   ├── admin.php          # Admin: user mgmt, room mgmt, activity logs, stats
│   │   ├── nilai-input.php    # Input nilai
│   │   └── csrf.php           # CSRF token endpoint
│   │   ├── nilai-input.php    # Input nilai
│   │   └── csrf.php           # CSRF token endpoint
│   └── logic/
│       ├── LoginRegisterLogic.php  # Auth business logic
│       ├── RuanganLogic.php        # Ruangan business logic
│       ├── RateLimiter.php         # Dual rate limiting (IP + session)
│       └── ActivityLogger.php      # Audit trail (login, logout, admin actions)
├── db/
│   ├── schema.sql             # Full DB schema (7 tables) + demo data
│   ├── migration.php          # CLI-only version-based migration
│   └── README.md              # Arsitektur data documentation
├── storage/ruangan/           # File JSON silabus per ruangan (runtime)
├── assets/                    # Static assets (favicon, icons)
├── scripts/scan-secrets.sh    # Security: pre-commit secret scanning
├── hooks/pre-commit           # Git pre-commit hook
├── .github/workflows/         # CI: scan-secrets.yml
├── build.sh                   # Build frontend → copy to root XAMPP
├── info.md                    # Deskripsi project ini
└── README.md                  # Main project documentation
```

---

## 👥 RBAC (Role-Based Access Control)

| Role | Deskripsi | Akses |
| --- | --- | --- |
| `guest` | Belum login (role awal semua pengunjung) | Landing page, login, register |
| `student` | Murid terdaftar (aktif) | Daftar kelas yang diikuti, belajar skill tree, kuis |
| `teacher` | Guru terdaftar (aktif) | Semua akses student + buat/hapus ruangan, edit silabus |
| `admin` | Administrator | **Semua akses** + panel admin (kelola user + ruangan + activity log) |

### Flow Autentikasi
1. User buka app → status `guest` (bisa lihat landing, login, register)
2. Register → **selalu role `student`** (opsi guru dihapus) → status `pending`
3. Admin approve → status `active` (bisa login)
4. Login → session PHP dibuat (`PLomba` cookie, httponly, secure, 2 jam lifetime)
5. **Session hijacking check** → setiap request cek `session_id()` di DB
6. React cek status via `auth/session.php` → tampilkan UI sesuai role
7. Idle 30 menit → auto-logout
8. **Double session prevention** → user sudah login tidak bisa akses /login atau /register (loading screen + redirect)
9. **Admin Panel** → `/admin` dengan 3 tab: Kelola User, Kelola Ruangan, Activity Log

---

## 🗃️ Database Schema (MySQL)

### Tabel `users`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK | Auto increment |
| `name` | VARCHAR(100) | Nama lengkap |
| `email` | VARCHAR(150) UNIQUE | Dipakai login |
| `password_hash` | VARCHAR(255) | Bcrypt (PHP `password_hash()`) |
| `role` | ENUM('student','teacher','admin') | Default: 'student' |
| `status` | ENUM('pending','active','rejected') | Default: 'pending' |
| `last_session_id` | VARCHAR(128) | Session hijacking detection |
| `created_at` | TIMESTAMP | Auto |

### Tabel `ruangan`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK | Auto increment |
| `nama` | VARCHAR(150) | Nama ruangan/mapel |
| `kode_ruangan` | CHAR(6) UNIQUE | Kode join murid (6 karakter) |
| `user_id` | INT UNSIGNED FK → users.id | Guru pembuat (CASCADE) |
| `created_at` | TIMESTAMP | Auto |
| `last_active_at` | TIMESTAMP | Reset hitung mundur 2 jam |

### Tabel `class_members`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK | Auto increment |
| `ruangan_id` | INT UNSIGNED FK → ruangan.id | CASCADE |
| `user_id` | INT UNSIGNED FK → users.id | CASCADE |
| `joined_at` | TIMESTAMP | Auto |
| `last_seen_at` | TIMESTAMP | Heartbeat terakhir |

### Tabel `syllabus`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK | Auto increment |
| `ruangan_id` | INT UNSIGNED FK → ruangan.id | UNIQUE, CASCADE |
| `file_path` | VARCHAR(255) | Pointer ke `storage/ruangan/<id>.json` |
| `updated_at` | TIMESTAMP | Auto update |

### Tabel `login_attempts`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK | Auto increment |
| `ip_address` | VARCHAR(45) | IPv4 atau IPv6 |
| `context` | ENUM('login','register') | Context rate limit |
| `attempted_at` | TIMESTAMP | Auto |

### Tabel `activity_log`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK | Auto increment |
| `user_id` | INT UNSIGNED FK → users.id | NULL = system event |
| `action` | VARCHAR(50) | login, logout, approve_user, dll. |
| `ip_address` | VARCHAR(45) | IP pelaku |
| `user_agent` | TEXT | Browser/device info |
| `created_at` | TIMESTAMP | Auto |

### Tabel `schema_version`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `version` | INT PK | Nomor versi migrasi |
| `description` | VARCHAR(255) | Deskripsi migrasi |
| `applied_at` | TIMESTAMP | Kapan dijalankan |

> **Catatan desain:** Isi skill tree (nodes/edges) disimpan sebagai **file JSON per ruangan** di `storage/ruangan/`, bukan di kolom DB. DB hanya menyimpan pointer kecil.

---

## 🔧 API Endpoints

### Auth (auth/*.php)
| Endpoint | Method | Deskripsi |
| --- | --- | --- |
| `auth/session.php` | GET | Cek status login + ambil CSRF token |
| `auth/login.php` | POST | Login (email + password) + dual rate limiter |
| `auth/register.php` | POST | Register (name, email, password) → role=student, status=pending |
| `auth/logout.php` | POST | Logout + activity logging |

### Ruangan (backend/controller/api/ruangan.php)
| Aksi | Method | Role | Deskripsi |
| --- | --- | --- | --- |
| `list` | GET | Semua (login) | Daftar ruangan + sisa waktu countdown |
| `create` | POST | teacher/admin | Buat ruangan baru |
| `join` | POST | student/admin | Gabung via kode 6 karakter |
| `delete` | POST | pemilik/admin | Hapus ruangan permanen |
| `rename` | POST | pemilik/admin | Ubah nama ruangan |
| `kick` | POST | pemilik/admin | Keluarkan murid |
| `touch` | POST | anggota/pemilik | Reset timer 2 jam |
| `syllabus` | GET/POST | anggota/pemilik/admin | Baca/simpan skill tree |
| `heartbeat` | POST | anggota | "Ada orang disini?" |

### Admin (backend/controller/api/admin.php)
| Aksi | Method | Role | Deskripsi |
| --- | --- | --- | --- |
| `list` | GET | admin | Daftar semua user + filter (search, role, status) |
| `stats` | GET | admin | Statistik jumlah user per role & status |
| `room_stats` | GET | admin | Statistik ruangan (total, online, active, expired) + detail |
| `approve` | POST | admin | Setujui user pending → active + log |
| `reject` | POST | admin | Tolak user pending → rejected + log |
| `change_role` | POST | admin | Ubah role user + log |
| `delete` | POST | admin | Hapus user permanen (CASCADE) + log |
| `reset_password` | POST | admin | Reset password user + log |
| `activity_logs` | GET | admin | Daftar activity log + filter + pagination |
| `activity_stats` | GET | admin | Statistik activity log |
| `kick` | POST | admin | Keluarkan anggota dari ruangan |

---

## 🎮 Fitur Utama

### 1. Skill Tree Visual (ReactFlow)
- **Guru** membangun skill tree dengan drag-and-drop: tambah node, hubungkan edges, edit materi/kuis per node
- **Murid** melihat skill tree sebagai peta belajar: node locked → in-progress → completed
- Menyimpan progress ke database (file JSON per ruangan)

### 2. Kuis Interaktif
- **Pilihan Ganda:** 4 opsi, pilih salah satu
- **Isi Rumpang (Fill-in-the-blank):** Model Duolingo — drag kata ke tempat yang kosong
- Setiap kuis bisa dilampiri gambar (max 250KB, base64)

### 3. Socratic AI Tutor (Google Gemini)
- Saat murid salah menjawab kuis, AI tidak langsung memberi jawaban
- AI bertanya balik: "Mengapa kamu memilih X? Apa yang kamu pahami dari konsep ini?"
- Menuntun murid menemukan jawaban sendiri melalui dialog
- Bisa dikustomisasi per-node lewat "Prompt Khusus AI" di editor guru

### 4. Sistem Ruangan
- Guru buat ruangan → dapat kode 6 karakter unik
- Murid gabung pakai kode → otomatis masuk ke skill tree guru
- Ruangan **otomatis terhapus setelah 2 jam tanpa aktivitas** (lazy cleanup)
- Heartbeat: browser yang terbuka di ruangan mengirim sinyal tiap 3 menit

### 5. Panel Admin (Tab Navigation)
- **👥 Tab Kelola User:** Daftar semua user, filter/search, approve/reject registrasi, ubah role, reset password, hapus user
- **🏠 Tab Kelola Ruangan:** Statistik ruangan (total, online, active, expired), tabel ruangan + countdown, detail modal + kelola anggota, kick member, hapus ruangan
- **📊 Tab Activity Log:** Audit trail semua aksi (login, logout, admin actions) + filter aksi/user, pagination, auto-refresh 15 detik, browser detection
- **Dashboard Statistik:** Cards jumlah user per role & status (di setiap tab)

### 6. Error Handling (Universal Error Pages)
- **401** — Akses Ditolak (belum login): tampilkan tombol Login
- **403** — Dilarang Masuk (role salah): tidak ada info halaman yang ada
- **404** — Halaman Tidak Ditemukan: URL tidak dikenal
- **429** — Terlalu Banyak Permintaan: rate limited
- **500** — Kesalahan Server: error internal

---

## 🔐 Sistem Keamanan

> Keamanan berdasarkan referensi project MEeL (`/opt/lampp/htdocs/MEeL`), diimplementasikan ke project ini.

### 1. Session Hijacking Detection
- Kolom `last_session_id` di tabel `users` — setiap request cek, jika session beda → session dihancurkan
- Admin dikecualikan (tidak di-logout saat multi-tab)

### 2. Dual Rate Limiting (Session + IP)
| Context | Maks Percobaan | Jendela Waktu | Keterangan |
| --- | --- | --- | --- |
| `login` | 5 per IP | 15 menit | Anti brute force password |
| `register` | 3 per IP | 1 jam | Anti spam akun |

- **Session-based:** `$_SESSION['login_fail_count']` — lock 5 menit setelah 5 gagal
- **IP-based:** Tabel `login_attempts` — track semua percobaan
- **Loopback exemption:** Localhost (127.0.0.1, ::1, localhost) bebas rate limit untuk dev
- **Reset:** Saat login/register berhasil → kedua counter di-reset

### 3. Activity Logger (Audit Trail)
| Event | Keterangan |
| --- | --- |
| `login` | Login berhasil |
| `login_failed` | Login gagal (password salah) |
| `rate_limited` | IP/session di-lock karena terlalu banyak gagal |
| `logout` | Logout |
| `register` | Registrasi baru |
| `register_failed` | Registrasi gagal |
| `approve_user` | Admin menyetujui user |
| `reject_user` | Admin menolak user |
| `change_role` | Admin mengubah role |
| `delete_user` | Admin menghapus user |
| `reset_password` | Admin reset password |

### 4. Secure Cookie
- `cookie_httponly = true` → JavaScript tidak bisa baca
- `cookie_samesite = 'Lax'` → cookie tidak dikirim saat cross-site
- `cookie_secure = dynamic` → otomatis `true` jika HTTPS
- `cookie_path = /Project_lomba/` → scope spesifik

### 5. Security Headers
| Header | Nilai | Fungsi |
| --- | --- | --- |
| `X-Content-Type-Options` | `nosniff` | Cegah MIME sniffing |
| `X-Frame-Options` | `DENY` | Cegah clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Kontrol referrer |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Blokir fitur browser |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolasi origin |
| `Strict-Transport-Security` | `max-age=15552000` (HTTPS only) | HSTS |

### 6. Back URL Validation
- Validasi `HTTP_REFERER` sebelum redirect setelah login
- Host referer harus cocok dengan `BASE_URL`
- Referer ke halaman login/register ditolak (cegah loop)
- Fallback ke `/classes` jika tidak valid

### 7. .htaccess — Folder Protection
| Folder | Proteksi |
| --- | --- |
| `/` (root) | SPA routing + blokir file sensitif |
| `assets/*` | Izinkan hanya css/js/img |
| `auth/` | Blokir config/settings |
| `backend/controller/logic/` | **DENIED** — logika internal |
| `backend/controller/api/` | Izinkan API endpoints |
| `db/` | **DENIED** — migration/schema |
| `hooks/` | **DENIED** — git hooks |
| `scripts/` | **DENIED** — shell scripts |
| `storage/*` | **DENIED** — file JSON + build artifacts |

### 8. Input Validation & Protection
- Password hash: Bcrypt (`password_hash()` + `password_verify()`)
- CSRF token: wajib untuk semua POST request (`X-CSRF-Token` header)
- Email validation: regex server-side
- Name validation: min 3 karakter
- Password validation: min 8 karakter
- SQL injection prevention: prepared statements (PDO)
- Register = **selalu student** (role dari client di-override server-side)

---

## 🔄 Database Migration

### Cara Pakai
```bash
# Jalankan migration (CLI-only)
php db/migration.php

# Output:
# ✅ Database project_lomba (MySQL)
# 📋 Migrasi v1: Tabel users, ruangan, class_members, syllabus
# 📋 Migrasi v2: Tabel login_attempts
# 📋 Migrasi v3: Tabel activity_log
# ✅ Database sudah versi terbaru (v3).
# 📋 Tabel:
#    - activity_log (0 baris)
#    - class_members (1 baris)
#    - login_attempts (0 baris)
#    - ruangan (1 baris)
#    - schema_version (3 baris)
#    - syllabus (0 baris)
#    - users (3 baris)
```

### Fitur Migration
| Fitur | Keterangan |
| --- | --- |
| CLI Only | `PHP_SAPI !== 'cli'` → 403 Forbidden di browser |
| Version-based | Tabel `schema_version` lacak versi |
| Idempotent | Bisa dijalankan berulang kali tanpa error |
| Safe | Tidak DROP/DELETE data yang ada |

---

## 📱 Responsive Design

| Breakpoint | Perubahan |
| --- | --- |
| ≤ 480px | Glass panel padding kompak, auth form kompak, role grid 1 kolom |
| ≤ 640px | Header stack vertikal, stats grid 2 kolom, admin header vertikal |
| ≤ 768px | Landing bg-glow resize, side-panel full-width, quiz 1 kolom |
| ≤ 400px | Stats grid 1 kolom |
| Touch devices | Semua tombol/input min-height 44px |
| Safe area | Padding bottom untuk phone dengan notch |

### Anti Double Session
- User sudah login → buka `/login` atau `/register` → **loading screen** → redirect ke `/classes`
- Tidak ada flash halaman login/register

---

## 🚀 Cara Menjalankan

### Prasyarat
- XAMPP/LAMPP (Apache + MySQL)
- Node.js 18+ (untuk build frontend)
- Database `project_lomba`

### Setup
```bash
# 1. Import/migrate database
php db/migration.php

# 2. Build frontend
bash build.sh

# 3. Buka di browser
# http://localhost/Project_lomba/
```

### Akun Demo
| Akun | Email | Password | Role | Status |
| --- | --- | --- | --- | --- |
| Admin | admin@example.com | password123 | admin | active |
| Guru | guru@example.com | password123 | teacher | active |
| Murid | murid@example.com | password123 | student | active |

### Development Mode
```bash
cd frontend
npm install
npm run dev
# Buka http://localhost:5173/Project_lomba/
```

### Build Produksi
```bash
bash build.sh
# Output: index.html + node-assets/ di root project
```

---

## 📊 Kriteria Penilaian OSCAR 3.0

| Kriteria | Bobot | Status |
| --- | --- | --- |
| Kesesuaian solusi dengan permasalahan | 15% | ✅ Pendidikan adaptif + AI tutor |
| Fungsionalitas & kelengkapan fitur | 20% | ✅ CRUD, search, RBAC, kuis, AI, admin panel |
| UI/UX & responsive design | 10% | ✅ Dark theme, glass-panel, mobile-ready, error pages |
| Kualitas source code | 15% | ✅ Organized, linted, documented, migration system |
| Inovasi & nilai tambah | 10% | ✅ Skill tree RPG + Socratic AI + activity log |
| Performance, security, accessibility | 10% | ✅ Dual rate limiter, session hijack detection, CSRF, activity log, .htaccess |
| Dokumentasi & presentasi | 10% | ✅ README, ROADMAP, info.md, proposal |
| **Bonus: Bukti landasan masalah** | 10% | 🔄 Belum |

---

## 📝 Catatan Teknis

- **Build workflow:** `bash build.sh` → Vite build → copy `index.html` + `node-assets/` ke root → XAMPP serve
- **Root `index.html` & `node-assets/`** adalah artefak build (di-gitignore) — sumber selalu di `frontend/`
- **Storage silabus:** File JSON di `storage/ruangan/<id>.json` (di-deny .htaccess, runtime di-ignore git)
- **AI Key:** `VITE_GEMINI_API_KEY` di `frontend/.env` — inlined ke bundle saat build (terlihat di DevTools)
- **Password:** Semua di-hash bcrypt; demo password = `password123`
- **Timezone:** MySQL timezone = WIB (+07:00)
- **Register:** Selalu role `student` — guru/admin ditambahkan via Panel Admin

---

*Project ini dikembangkan untuk kompetisi OSCAR 3.0 Web Development Competition oleh tim yang beranggotakan siswa SMA/SMK se-JABODETABEK.*
