# 🐙 FlacTopus AI

> **Sistem Pendidikan Adaptif Berbasis Skill Tree dengan AI Socratic Tutor**
>
> Platform manajemen kelas & kurikulum interaktif yang memetakan pemahaman murid layaknya *Skill Tree* dalam game RPG. Guru membangun rute belajar secara visual, murid menjelajahi materi seperti quest, dan AI Gemini membimbing lewat dialog sokratik — bukan sekadar memberi jawaban.

![License](https://img.shields.io/badge/license-GPLv3-green)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![PHP](https://img.shields.io/badge/PHP-8-777BB4?logo=php)
![MySQL](https://img.shields.io/badge/MySQL-MariaDB-4479A1?logo=mysql)

---

## 📌 Daftar Isi

- [Tentang Project](#-tentang-project)
- [Masalah yang Dijawab](#-masalah-yang-dijawab)
- [Fitur Utama](#-fitur-utama)
- [Teknologi yang Digunakan](#-teknologi-yang-digunakan)
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Struktur Project](#-struktur-project)
- [Prasyarat](#-prasyarat)
- [Cara Instalasi](#-cara-instalasi)
- [Cara Penggunaan](#-cara-penggunaan)
- [Sistem Keamanan](#-sistem-keamanan)
- [RBAC (Role-Based Access Control)](#-rbac-role-based-access-control)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints)
- [Kontribusi](#-kontribusi)

---

## 🌿 Tentang Project

FlacTopus AI adalah **sistem pendidikan adaptif bertenaga AI** yang dikembangkan untuk kompetisi **OSCAR 3.0 x GDGOC STT NF — Web Development Competition**.

Project ini menjawab tantangan dalam pendidikan konvensional di mana:
- Guru kesulitan memetakan pemahaman **individual** setiap murid
- Materi belajar bersifat **statis** dan tidak adaptif
- Tidak ada mekanisme evaluasi **berkelanjutan** yang interaktif
- Proses ujian terasa **membosankan** dan tidak memotivasi

FlacTopus mengubah paradigma tersebut dengan menghadirkan **Skill Tree visual** (seperti game RPG), **AI Socratic Tutor** yang membimbing lewat dialog, dan **sistem gamifikasi** yang membuat proses belajar jadi menyenangkan.

---

## 🎯 Masalah yang Dijawab

| Masalah | Solusi FlacTopus |
| --- | --- |
| Guru sulit memetakan pemahaman individual murid | **Skill Tree visual** — guru melihat progress tiap node materi |
| Belajar tidak adaptif (satu materi untuk semua) | **AI Tutor Gemini** mendeteksi kesalahan & menjelaskan dengan pendekatan berbeda per murid |
| Materi statis, tidak interaktif | **Visual Builder** drag-and-drop untuk membangun skill tree sendiri |
| Tidak ada mekanisme evaluasi berkelanjutan | **Kuis interaktif** (pilihan ganda + isi rumpang) terintegrasi di setiap node |
| Ujian terasa membosankan | **Boss Fight Mode** bergaya RPG dengan HP, efek visual, dan transisi sinematik |

---

## ✨ Fitur Utama

### 🌳 Skill Tree Visual (ReactFlow)
Guru membangun kurikulum sebagai graf nodes & edges dengan **drag-and-drop**. Murid melihat rute belajar sebagai peta interaktif — node terkunci → in-progress → completed. Progress disimpan sebagai file JSON per ruangan.

### 🤖 Socratic AI Tutor (Google Gemini)
Saat murid salah menjawab, AI **tidak langsung memberi jawaban**. Sebaliknya, AI bertanya balik secara dialogis: *"Mengapa kamu memilih X? Apa yang kamu pahami dari konsep ini?"* — menuntun murid menemukan jawaban sendiri melalui pendekatan Socrates.

### 🎮 Gamifikasi & Boss Fight Mode
Kuis memiliki mode **Boss Fight** bergaya RPG lengkap dengan:
- Health Point (HP) Boss dan Murid
- Efek visual saat jawaban benar/salah
- Transisi sinematik dan musik latar épik
- Suara retro 8-bit (Web Audio API) untuk respons real-time

### 🏫 Sistem Ruangan Kelas
- Guru buat ruangan → dapat **kode unik 6 karakter**
- Murid gabung pakai kode → otomatis masuk ke skill tree guru
- **Soft Delete** — guru hapus ruangan → data tersimpan 30 hari, admin bisa pulihkan
- **Heartbeat system** — browser mengirim sinyal tiap 3 menit
- **Ketua Kelas** — guru bisa mengangkat murid sebagai sub-admin

### 🔑 Registrasi Guru dengan Master Key
- Guru bisa daftar dengan **Master Key** (token single-use dari admin) → langsung aktif
- Guru bisa daftar **tanpa Master Key** → status `pending` (perlu verifikasi admin)
- Admin generate Master Key di Panel Admin → deskripsi + expiry date

### 🟢 Auto-Approve (Murid & Guru Terpisah)
- Admin punya **2 toggle terpisah** di Panel Admin:
  - **Auto-Approve Murid**: Jika ON → murid langsung aktif tanpa approval
  - **Auto-Approve Guru**: Jika ON → guru tanpa Master Key langsung aktif
- Cocok untuk situasi trafik normal (ON) atau butuh keamanan ekstra (OFF)
- Guru dengan **Master Key** selalu langsung aktif (tidak terpengaruh toggle)

### 🚀 Auto-Login After Register
- Jika auto-approve **ON** → murid langsung redirect ke `/classes` (tidak perlu login lagi)
- Jika guru pakai **Master Key** → langsung redirect ke `/classes`
- Jika status **pending** → redirect ke halaman login dengan pesan

### 🛡️ Panel Admin (4 Tab)
- **👥 Kelola User** — filter/search, approve/reject registrasi, ubah role, reset password, **2 toggle Auto-Approve (Murid & Guru)**
- **🔑 Master Key** — generate, lihat, hapus master key untuk registrasi guru
- **🗑️ Ruangan Terhapus** — lihat ruangan soft-deleted, **pulihkan** atau **hapus permanen** (retensi 30 hari)
- **📊 Activity Log** — audit trail semua aksi + auto-refresh 15 detik

### 📊 Class Analytics & Anti-Cheat
- Dashboard analitik: rata-rata nilai, partisipasi, materi tersulit
- **Deteksi Nyontek** — otomatis merekam jika murid berpindah tab saat kuis
- Data non-akademik (Ice Breaking) dikecualikan dari grafik

---

## 🛠️ Teknologi yang Digunakan

| Layer | Teknologi | Keterangan |
| --- | --- | --- |
| **Frontend** | React 19 + Vite 8 | SPA dengan React Router v7 |
| **Visualisasi Skill Tree** | ReactFlow (@xyflow/react) | Drag-and-drop nodes & edges |
| **Animasi** | Framer Motion + Canvas Confetti | Transisi UI & efek selebrasi |
| **AI Tutor** | Google Gemini API | Socratic questioning approach |
| **Backend** | PHP 8 Murni (tanpa framework) | API JSON, session-based auth |
| **Database** | MySQL (MariaDB via XAMPP) | 10 tabel + file JSON silabus |
| **Keamanan** | CSRF, Honeypot, Session Hijack Detection, Dual Rate Limiter, Activity Log, Soft Delete | Berdasarkan referensi MEeL |
| **Build** | Vite build → bash build.sh → XAMPP | Production-ready |
| **Linting** | OxLint | Cepat, ringan |
| **CI/CD** | GitHub Actions | Secret scanning |
| **Migrasi** | db/migration.php (CLI-only) | Version-based, idempotent (v1-v9) |

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React SPA)                   │
│  React + Vite + React Router + ReactFlow                 │
│  Pages: Landing, Login, Register, ClassDashboard,        │
│         TeacherDashboard, StudentDashboard, Quiz,         │
│         RoomDetail, AdminPanel (4 tabs), ErrorPage        │
├─────────────────────────────────────────────────────────┤
│                   BACKEND (PHP Murni)                     │
│  API JSON: auth/*.php, ruangan.php, admin.php, quiz.php  │
│  Logic: LoginRegisterLogic, RuanganLogic, MasterKeyLogic, │
│         RateLimiter, ActivityLogger, GarbageCollector     │
├─────────────────────────────────────────────────────────┤
│                     DATABASE (MySQL)                      │
│  Tables: users, ruangan, class_members, syllabus,         │
│          quiz_attempts, login_attempts, activity_log,     │
│          master_keys, app_settings, schema_version        │
│  + File JSON per ruangan di storage/ruangan/<id>.json     │
├─────────────────────────────────────────────────────────┤
│                    AI (Google Gemini)                      │
│  Socratic AI Tutor — menuntun murid lewat dialog         │
│  via backend proxy (gemini.php) — API key server-side     │
└─────────────────────────────────────────────────────────┘
```

**Alur Aplikasi:**
1. **React (JSX)** menggambar semua halaman UI
2. **PHP** berperan sebagai backend murni — mengembalikan JSON
3. **MySQL** menyimpan data user, ruangan, keanggotaan, master keys, settings
4. **File JSON** menyimpan struktur skill tree per ruangan (DB hanya pointer)
5. **Google Gemini** menyediakan AI Socratic Tutor (diproxy lewat backend)

---

## 📁 Struktur Project

```
FlacTopus/
├── frontend/                      # React App (Vite)
│   ├── src/
│   │   ├── pages/                 # Landing, Login, Register, ClassDashboard,
│   │   │                          # TeacherDashboard, StudentDashboard, Quiz,
│   │   │                          # RoomDetail, AdminPanel, ErrorPage
│   │   ├── components/            # ProtectedRoute, quiz/*, analytics/*
│   │   ├── hooks/                 # useAuth (session PHP), useRoomHeartbeat
│   │   ├── utils/                 # api.js, roles.js, aiService.js, sounds.js
│   │   ├── data/                  # mockData.js, templateLibrary.js
│   │   ├── App.jsx                # Route definitions + RBAC matrix
│   │   └── index.css              # CSS variables, dark theme, responsive
│   ├── vite.config.js             # base: '/' (production)
│   └── (no .env — API key server-side di auth/config.php)
├── auth/                          # PHP auth backend
│   ├── config.php                 # DB, session config, security headers
│   ├── auth.php                   # require_auth, session hijacking, CSRF
│   ├── login.php                  # POST API login + dual rate limiter
│   ├── register.php               # POST API register (honeypt + master key + auto-approve)
│   ├── session.php                # GET session check + CSRF token
│   └── logout.php                 # POST logout + activity logging
├── backend/controller/
│   ├── api/
│   │   ├── ruangan.php            # CRUD ruangan + trash management
│   │   ├── admin.php              # Admin: user mgmt, master keys, settings
│   │   ├── quiz.php               # API kuis + analytics + anti-cheat
│   │   └── gemini.php             # Backend proxy Gemini API
│   └── logic/
│       ├── LoginRegisterLogic.php  # Auth + auto-login setelah register
│       ├── RuanganLogic.php        # Ruangan + soft delete + trash
│       ├── MasterKeyLogic.php      # Generate/validate/manage master keys
│       ├── RateLimiter.php         # Dual rate limiting (IP + session)
│       ├── ActivityLogger.php      # Audit trail
│       └── GarbageCollector.php    # Auto-clean: activity_log, orphaned files, trashed rooms
├── db/
│   ├── migration.php              # CLI-only version-based migration (v1-v8)
│   └── README.md                  # Arsitektur data documentation
├── storage/
│   ├── ruangan/                   # File JSON silabus per ruangan
│   └── chat/                      # File JSON riwayat chat AI per murid
├── scripts/
│   ├── gc.php                     # CLI manual trigger untuk Garbage Collector
│   └── scan-secrets.sh            # Security: pre-commit secret scanning
├── hooks/pre-commit               # Git pre-commit hook
├── .github/workflows/             # CI: scan-secrets.yml
├── build.sh                       # Build frontend → copy to root XAMPP
├── info.md                        # Changelog project
└── README.md                      # Dokumentasi project ini
```

---

## 📋 Prasyarat

- **XAMPP/LAMPP** (Apache + MySQL) — [download](https://www.apachefriends.org/)
- **Node.js v22+** — [download](https://nodejs.org/) (via nvm direkomendasikan)
- **Git** — [download](https://git-scm.com/)

---

## ⚙️ Cara Instalasi

### 1. Klon Repositori

```bash
git clone https://github.com/username/FlacTopus.git
cd FlacTopus
```

### 2. Pindahkan ke XAMPP htdocs

```bash
# Linux/Mac
cp -r . /opt/lampp/htdocs/FlacTopus
```

### 3. Setup Database

```bash
# Jalankan migrasi (CLI-only, otomatis buat tabel + data demo)
php db/migration.php
```

### 4. Setup API Key AI (Opsional)

```bash
# API key disimpan di auth/config.php (server-side, tidak di frontend)
# Edit auth/config.php → set GEMINI_API_KEY
```

> ⚠️ Tanpa API Key, aplikasi tetap berjalan dalam *mode simulasi*.

### 5. Build Frontend

```bash
cd frontend
npm install
npm run build
```

Atau gunakan script build:

```bash
bash build.sh
```

---

## 🚀 Cara Penggunaan

### Production Mode

```bash
# Pastikan Apache & MySQL sudah menyala
# Buka browser:
http://localhost/FlacTopus/
```

### Development Mode (Hot Reload)

```bash
cd frontend
npm install
npm run dev
# Buka http://localhost:5173/FlacTopus/
```

### Akun Demo

| Akun | Email | Password | Role | Status |
| --- | --- | --- | --- | --- |
| Admin | `admin@example.com` | `password123` | admin | active |
| Guru | `guru@example.com` | `password123` | teacher | active |
| Murid | `murid@example.com` | `password123` | student | active |

---

## 🔐 Sistem Keamanan

Keamanan dibangun berdasarkan referensi project **MEeL** dan diimplementasikan secara menyeluruh:

### 1. Session Hijacking Detection
- Kolom `last_session_id` di tabel `users`
- Setiap request dicek → jika session ID berbeda → session dihancurkan otomatis

### 2. Dual Rate Limiting (IP + Session)

| Context | Maks Percobaan | Jendela Waktu | Keterangan |
| --- | --- | --- | --- |
| Login | 5 per IP | 15 menit | Anti brute force password |
| Register | 3 per IP | 1 jam | Anti spam akun |

- **Session-based:** `$_SESSION['login_fail_count']` — lock 5 menit setelah 5 gagal
- **IP-based:** Tabel `login_attempts` — track semua percobaan
- **Loopback exemption:** Localhost bebas rate limit untuk development

### 3. Honeypot Field (Anti-Bot)
- Input tersembunyi "Website" di form registrasi
- Bot otomatis mengisi seluruh field → backend mendeteksi → request ditolak
- Tidak ada UI yang terpengaruh untuk manusia (CSS hidden)

### 4. Activity Logger (Audit Trail)
Semua aktivitas dicatat ke tabel `activity_log`: login, logout, register, approve, reject, change_role, delete_user, reset_password, rate_limited, register_honeypot_caught, generate_master_key, delete_master_key, update_setting.

### 5. Secure Cookie
- `httponly = true` → JavaScript tidak bisa baca
- `samesite = 'Lax'` → cookie tidak dikirim saat cross-site
- `secure = dynamic` → otomatis `true` jika HTTPS

### 6. Security Headers

| Header | Fungsi |
| --- | --- |
| `X-Content-Type-Options: nosniff` | Cegah MIME sniffing |
| `X-Frame-Options: DENY` | Cegah clickjacking |
| `Referrer-Policy: strict-origin-when-cross-origin` | Kontrol referrer |
| `Permissions-Policy` | Blokir kamera, mikrofon, lokasi |
| `Cross-Origin-Opener-Policy: same-origin` | Isolasi origin |
| `Strict-Transport-Security` | HSTS (HTTPS only) |

### 7. Soft Delete & Recovery
- Guru **soft delete** ruangan → data tersimpan 30 hari
- Admin bisa **pulihkan** atau **hapus permanen** dari tab "Ruangan Terhapus"
- **GarbageCollector** otomatis hard delete setelah 30 hari

### 8. Input Validation & Protection
- Password: Bcrypt (`password_hash()` + `password_verify()`)
- CSRF: Token wajib untuk semua POST request (`X-CSRF-Token` header)
- SQL Injection: Prepared statements (PDO, `EMULATE_PREPARES => false`)
- Register: Role di-override server-side

---

## 👥 RBAC (Role-Based Access Control)

| Role | Deskripsi | Akses |
| --- | --- | --- |
| `guest` | Belum login | Landing page, login, register |
| `student` | Murid terdaftar (aktif) | Kelas yang diikuti, belajar, kuis |
| `teacher` | Guru terdaftar (aktif) | Semua akses student + buat/hapus ruangan, edit silabus |
| `admin` | Administrator | **Auto redirect ke `/admin`**, kelola user, master keys, settings |

### RBAC Detail per Aksi

| Aksi | Guest | Student | Teacher (pembuat) | Ketua Kelas | Admin |
| --- | --- | --- | --- | --- | --- |
| Lihat ruangan | ❌ | Ruangan diikuti | Ruangan sendiri | — | ❌ (privacy) |
| Buat ruangan | ❌ | ❌ | ✅ | ❌ | ❌ |
| Hapus ruangan | ❌ | ❌ | ✅ (soft delete) | ❌ | ❌ |
| Rename ruangan | ❌ | ❌ | ✅ (sendiri) | ❌ | ❌ |
| Edit silabus | ❌ | ❌ | ✅ (sendiri) | ❌ | ❌ |
| Lihat members | ❌ | ❌ | ✅ (sendiri) | ✅ (sendiri) | ❌ |
| Kick murid | ❌ | ❌ | ✅ (sendiri) | ❌ | ❌ |
| Analytics | ❌ | ❌ | ✅ (sendiri) | ✅ (sendiri) | ❌ |
| **Kelola User** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Master Keys** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Auto-Approve Toggle** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Lihat Ruangan Terhapus** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Restore Ruangan** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Force Delete Ruangan** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Activity Log** | ❌ | ❌ | ❌ | ❌ | ✅ |

### Flow Autentikasi & Registrasi

**Registrasi Murid:**
1. Pilih "Murid" → isi form → Submit
2. Backend cek `student_auto_approve` setting
3. Jika **ON** → status `active` → auto-login → redirect ke `/classes`
4. Jika **OFF** → status `pending` → redirect ke login dengan pesan "Tunggu approve admin"

**Registrasi Guru:**
1. Pilih "Guru" → isi form → Submit
2. **Dengan Master Key** → status `active` → auto-login → redirect ke `/classes`
3. **Tanpa Master Key + Auto-Approve ON** → status `active` → auto-login → redirect ke `/classes`
4. **Tanpa Master Key + Auto-Approve OFF** → status `pending` → perlu verifikasi admin

**Login:**
1. User buka app → status `guest`
2. Login → **admin redirect ke `/admin`**, guru/murid redirect ke `/classes`
3. Session PHP dibuat (cookie `FlacTopus`, httponly, 2 jam lifetime)
4. Session hijacking check → setiap request cek `session_id()` di DB
5. Idle 30 menit → auto-logout
6. Double session prevention → user sudah login → redirect

**Admin Access:**
- Admin yang akses `/classes` → otomatis redirect ke `/admin`

---

## 🗃️ Database Schema

### Tabel `users`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK | Auto increment |
| `name` | VARCHAR(100) | Nama lengkap |
| `email` | VARCHAR(150) UNIQUE | Dipakai login |
| `password_hash` | VARCHAR(255) | Bcrypt |
| `role` | ENUM('student','teacher','admin') | Default: 'student' |
| `status` | ENUM('pending','active','rejected') | Default: 'pending' |
| `last_session_id` | VARCHAR(128) | Session hijacking detection |
| `created_at` | TIMESTAMP | Auto |

### Tabel `ruangan`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK | Auto increment |
| `nama` | VARCHAR(150) | Nama ruangan/mapel |
| `kode_ruangan` | CHAR(6) UNIQUE | Kode join murid |
| `user_id` | INT UNSIGNED FK | Guru pembuat (CASCADE) |
| `theme_color` | VARCHAR(50) | Tema warna UI (default: #0f172a) |
| `created_at` | TIMESTAMP | Auto |
| `last_active_at` | TIMESTAMP | Reset timer 2 jam |
| `deleted_at` | TIMESTAMP NULL | Soft delete timestamp |
| `deleted_by` | INT UNSIGNED NULL | ID user yang menghapus |

### Tabel `class_members`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK | Auto increment |
| `ruangan_id` | INT UNSIGNED FK | CASCADE |
| `user_id` | INT UNSIGNED FK | CASCADE |
| `joined_at` | TIMESTAMP | Auto |
| `last_seen_at` | TIMESTAMP NULL | Heartbeat terakhir |
| `role` | ENUM('member','admin') | Admin = Ketua Kelas |
| `is_marked` | TINYINT(1) | Tanda khusus murid |
| `pinned_at` | TIMESTAMP NULL | Waktu dipin |

### Tabel `master_keys` (v7)
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK | Auto increment |
| `key_value` | VARCHAR(64) UNIQUE | Token unik (single-use) |
| `description` | VARCHAR(255) NULL | Keterangan (mis: Guru TKJ 2024) |
| `max_uses` | INT UNSIGNED | Max penggunaan (selalu 1) |
| `used_count` | INT UNSIGNED | Sudah dipakai berapa kali |
| `used_by` | INT UNSIGNED NULL | User ID yang pakai |
| `used_at` | TIMESTAMP NULL | Kapan dipakai |
| `expires_at` | TIMESTAMP NULL | Kapan expired (NULL = tidak expired) |
| `created_by` | INT UNSIGNED FK | Admin yang generate |
| `created_at` | TIMESTAMP | Auto |

### Tabel `app_settings` (v8)
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `setting_key` | VARCHAR(50) PK | Nama setting |
| `setting_value` | VARCHAR(255) | Nilai setting |
| `description` | VARCHAR(255) | Keterangan |
| `updated_at` | TIMESTAMP | Auto update |

**Default Settings:**
| Key | Default | Deskripsi |
| --- | --- | --- |
| `student_auto_approve` | `0` | Jika `1`, murid langsung aktif tanpa approve admin |
| `teacher_auto_approve` | `0` | Jika `1`, guru tanpa Master Key langsung aktif |
| `maintenance_mode` | `0` | Jika `1`, site dalam mode maintenance |

### Tabel `quiz_attempts`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK | Auto increment |
| `ruangan_id` | INT UNSIGNED FK | Kelas tempat kuis |
| `user_id` | INT UNSIGNED FK | Murid yang mengerjakan |
| `node_id` | VARCHAR(100) | ID node Skill Tree |
| `node_label` | VARCHAR(255) | Judul node |
| `score` | INT | Nilai 0-100 |
| `total_questions` | INT | Total soal |
| `correct_answers` | INT | Jawaban benar |
| `wrong_answers` | JSON NULL | Pertanyaan salah |
| `tab_switches` | INT | Deteksi pindah tab (anti-cheat) |
| `created_at` | TIMESTAMP | Auto |

### Tabel Pendukung
| Tabel | Keterangan |
| --- | --- |
| `syllabus` | Pointer ke file JSON silabus per ruangan |
| `login_attempts` | Rate limiting (IP + context) |
| `activity_log` | Audit trail semua aktivitas |
| `schema_version` | Pelacakan versi migrasi |

> **Catatan desain:** Isi skill tree (nodes/edges) disimpan sebagai **file JSON per ruangan** di `storage/ruangan/`, bukan di kolom DB. DB hanya menyimpan pointer kecil.

---

## 🔧 API Endpoints

### Auth (`auth/*.php`)
| Endpoint | Method | Deskripsi |
| --- | --- | --- |
| `auth/session.php` | GET | Cek status login + ambil CSRF token |
| `auth/login.php` | POST | Login + dual rate limiter |
| `auth/register.php` | POST | Register (honeypot + master key + auto-approve) |
| `auth/logout.php` | POST | Logout + activity logging |

### Ruangan (`backend/controller/api/ruangan.php`)
| Aksi | Method | Role | Deskripsi |
| --- | --- | --- | --- |
| `list` | GET | teacher/student | Daftar ruangan aktif |
| `trash` | GET | admin | Daftar ruangan terhapus + sisa hari |
| `create` | POST | teacher | Buat ruangan baru |
| `join` | POST | student | Gabung via kode 6 karakter |
| `delete` | POST | pemilik | **Soft delete** (30 hari retention) |
| `restore` | POST | admin | Pulihkan dari trash |
| `force_delete` | POST | admin | Hapus permanen dari trash |
| `rename` | POST | pemilik | Ubah nama ruangan |
| `kick` | POST | pemilik | Keluarkan murid |
| `set_admin` | POST | pemilik | Atur ketua kelas |
| `toggle_mark` | POST | pemilik | Tandai murid |
| `toggle_pin` | POST | pemilik | Pin murid |
| `touch` | POST | anggota | Keep-alive |
| `syllabus` | GET/POST | anggota/pemilik | Baca/simpan skill tree |
| `heartbeat` | POST | anggota | "Ada orang disini?" |

### Admin (`backend/controller/api/admin.php`)
| Aksi | Method | Role | Deskripsi |
| --- | --- | --- | --- |
| `list` | GET | admin | Daftar semua user + filter |
| `stats` | GET | admin | Statistik user per role & status |
| `settings` | GET | admin | Ambil app settings (auto-approve, dll) |
| `master_keys` | GET | admin | Daftar semua master keys |
| `approve` | POST | admin | Setujui user pending |
| `reject` | POST | admin | Tolak user pending |
| `change_role` | POST | admin | Ubah role user |
| `delete` | POST | admin | Hapus user permanen |
| `reset_password` | POST | admin | Reset password user |
| `update_setting` | POST | admin | Update app settings (auto-approve toggle) |
| `generate_master_key` | POST | admin | Generate master key baru |
| `delete_master_key` | POST | admin | Hapus master key |
| `kick` | POST | admin | Keluarkan anggota dari ruangan |
| `restore` | POST | admin | Pulihkan ruangan dari trash |
| `force_delete` | POST | admin | Hapus permanen dari trash |
| `activity_logs` | GET | admin | Audit trail + filter + pagination |
| `activity_stats` | GET | admin | Statistik activity log |

### Quiz (`backend/controller/api/quiz.php`)
| Aksi | Method | Role | Deskripsi |
| --- | --- | --- | --- |
| `analytics` | GET | guru/ketua | Rangkuman kelas |
| `analytics_trend` | GET | guru/ketua | Grafik tren nilai |
| `analytics_participation` | GET | guru/ketua | Partisipasi murid |
| `analytics_leaderboard` | GET | guru/ketua | Peringkat murid |
| `analytics_mistakes` | GET | guru/ketua | Soal sering salah |
| `analytics_cheating` | GET | guru/ketua | Deteksi pindah tab |
| `student_progress` | GET | murid | Progress kuis murid |
| `chat_history` | GET | guru | Riwayat chat AI murid |
| `submit` | POST | murid | Submit jawaban kuis |
| `save_chat` | POST | murid/guru | Simpan riwayat chat AI |

---

## 📱 Responsive Design

| Breakpoint | Perubahan |
| --- | --- |
| ≤ 480px | Glass panel padding kompak, auth form 1 kolom |
| ≤ 640px | Header stack vertikal, stats grid 2 kolom |
| ≤ 768px | Side-panel full-width, quiz 1 kolom, admin tabs scroll |
| Touch devices | Semua tombol/input min-height 44px |

---

## 🔄 Database Migration

```bash
# Jalankan migrasi (CLI-only)
php db/migration.php

# Output:
# ✅ Database project_lomba (MySQL)
# 📋 v1: Schema awal (users, ruangan, class_members, syllabus)
# 📋 v2: login_attempts (rate limiting)
# 📋 v3: activity_log (audit trail)
# 📋 v4: theme_color, role, is_marked, pinned_at
# 📋 v5: quiz_attempts (rekam jawaban murid)
# 📋 v6: deleted_at, deleted_by (soft delete)
# 📋 v7: master_keys (registrasi guru via token)
# 📋 v8: app_settings (auto-approve, maintenance mode)
# 📋 v9: tambah setting teacher_auto_approve
# ✅ Database sudah versi terbaru (v9).
```

| Fitur | Keterangan |
| --- | --- |
| CLI Only | `PHP_SAPI !== 'cli'` → 403 Forbidden di browser |
| Version-based | Tabel `schema_version` lacak versi |
| Idempotent | Bisa dijalankan berulang kali tanpa error |
| Safe | Tidak DROP/DELETE data yang ada |

---

## 🤝 Kontribusi

1. **Fork** repositori ini
2. Buat branch fitur baru: `git checkout -b fitur-baru`
3. Commit perubahan: `git commit -m 'Menambahkan fitur baru'`
4. Push ke branch: `git push origin fitur-baru`
5. Buat **Pull Request**

> ⚠️ Pastikan `npm run lint` (oxlint) tidak mengembalikan error sebelum submit PR.

---

## 📝 Catatan Teknis

- **Build workflow:** `bash build.sh` → Vite build → copy `index.html` + `node-assets/` ke root → XAMPP serve
- **Root `index.html` & `node-assets/`** adalah artefak build (di-gitignore) — sumber selalu di `frontend/`
- **Storage silabus:** File JSON di `storage/ruangan/<id>.json` (di-deny .htaccess)
- **AI Key:** `GEMINI_API_KEY` di `auth/config.php` (server-side, tidak ter-expose ke frontend)
- **Password:** Semua di-hash bcrypt; demo password = `password123`
- **Timezone:** MySQL timezone = WIB (+07:00)
- **Register Murid:** Auto-approve ON → langsung aktif; OFF → pending approval admin
- **Register Guru:** Dengan Master Key → langsung aktif; Tanpa Master Key + Auto-approve ON → langsung aktif; Tanpa Master Key + Auto-approve OFF → pending
- **Admin Access:** Admin yang akses `/classes` → otomatis redirect ke `/admin`
- **Soft Delete:** Ruangan yang dihapus guru tersimpan 30 hari sebelum dihapus permanen oleh GarbageCollector

---

*Project ini dikembangkan untuk kompetisi **OSCAR 3.0 Web Development Competition** oleh tim yang beranggotakan siswa SMA/SMK se-JABODETABEK.*
