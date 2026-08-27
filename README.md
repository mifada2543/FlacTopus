# 🐙 FlacTopus AI

> **Sistem Pendidikan Adaptif Berbasis Skill Tree dengan AI Socratic Tutor**
>
> Platform manajemen kelas & kurikulum interaktif yang memetakan pemahaman murid layaknya *Skill Tree* dalam game RPG. Guru membangun rute belajar secara visual, murid menjelajahi materi seperti quest, dan AI Gemini membimbing lewat dialog sokratik — bukan sekadar memberi jawaban.

![License](https://img.shields.io/badge/license-MIT-green)
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
- **Heartbeat system** — browser mengirim sinyal tiap 3 menit
- **Ketua Kelas** — guru bisa mengangkat murid sebagai sub-admin

### 📊 Class Analytics & Anti-Cheat
- Dashboard analitik: rata-rata nilai, partisipasi, materi tersulit
- **Deteksi Nyontek** — otomatis merekam jika murid berpindah tab saat kuis
- Data non-akademik (Ice Breaking) dikecualikan dari grafik

### 🛡️ Panel Admin Lengkap (3 Tab)
- **👥 Kelola User** — filter/search, approve/reject registrasi, ubah role, reset password
- **🏠 Kelola Ruangan** — statistik real-time, detail modal, kick member
- **📊 Activity Log** — audit trail semua aksi + auto-refresh 15 detik

---

## 🛠️ Teknologi yang Digunakan

| Layer | Teknologi | Keterangan |
| --- | --- | --- |
| **Frontend** | React 19 + Vite 8 | SPA dengan React Router v7 |
| **Visualisasi Skill Tree** | ReactFlow (@xyflow/react) | Drag-and-drop nodes & edges |
| **Animasi** | Framer Motion + Canvas Confetti | Transisi UI & efek selebrasi |
| **AI Tutor** | Google Gemini API | Socratic questioning approach |
| **Backend** | PHP 8 Murni (tanpa framework) | API JSON, session-based auth |
| **Database** | MySQL (MariaDB via XAMPP) | 7 tabel + file JSON silabus |
| **Keamanan** | CSRF, Session Hijack Detection, Dual Rate Limiter, Activity Log | Berdasarkan referensi MEeL |
| **Build** | Vite build → bash build.sh → XAMPP | Production-ready |
| **Linting** | OxLint | Cepat, ringan |
| **CI/CD** | GitHub Actions | Secret scanning |
| **Migrasi** | db/migration.php (CLI-only) | Version-based, idempotent |

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React SPA)                   │
│  React + Vite + React Router + ReactFlow                 │
│  Pages: Landing, Login, Register, ClassDashboard,        │
│         TeacherDashboard, StudentDashboard, Quiz,         │
│         RoomDetail, AdminPanel (3 tabs), ErrorPage        │
├─────────────────────────────────────────────────────────┤
│                   BACKEND (PHP Murni)                     │
│  API JSON: auth/*.php, ruangan.php, admin.php             │
│  Logic: LoginRegisterLogic, RuanganLogic,                 │
│         RateLimiter, ActivityLogger                       │
├─────────────────────────────────────────────────────────┤
│                     DATABASE (MySQL)                      │
│  Tables: users, ruangan, class_members, syllabus,         │
│          quiz_attempts, login_attempts, activity_log,     │
│          schema_version                                   │
│  + File JSON per ruangan di storage/ruangan/<id>.json     │
├─────────────────────────────────────────────────────────┤
│                    AI (Google Gemini)                      │
│  Socratic AI Tutor — menuntun murid lewat dialog         │
│  via frontend/src/utils/aiService.js                      │
└─────────────────────────────────────────────────────────┘
```

**Alur Aplikasi:**
1. **React (JSX)** menggambar semua halaman UI
2. **PHP** berperan sebagai backend murni — mengembalikan JSON
3. **MySQL** menyimpan data user, ruangan, & keanggotaan
4. **File JSON** menyimpan struktur skill tree per ruangan (DB hanya pointer)
5. **Google Gemini** menyediakan AI Socratic Tutor

---

## 📁 Struktur Project

```
FlacTopus/
├── frontend/                      # React App (Vite)
│   ├── src/
│   │   ├── pages/                 # Landing, Login, Register, ClassDashboard,
│   │   │                          # TeacherDashboard, StudentDashboard, Quiz,
│   │   │                          # RoomDetail, AdminPanel, ErrorPage
│   │   ├── components/            # ProtectedRoute (RBAC gate)
│   │   ├── hooks/                 # useAuth (session PHP), useRoomHeartbeat
│   │   ├── utils/                 # api.js, roles.js, aiService.js (Gemini)
│   │   ├── data/                  # mockData.js (template silabus fallback)
│   │   ├── App.jsx                # Route definitions + RBAC matrix
│   │   └── index.css              # CSS variables, dark theme, responsive
│   ├── vite.config.js             # base: '/FlacTopus/'
│   └── (no .env — API key server-side di auth/config.php)
├── auth/                          # PHP auth backend
│   ├── config.php                 # DB, session config, security headers
│   ├── auth.php                   # require_auth, session hijacking, CSRF
│   ├── login.php                  # POST API login + dual rate limiter
│   ├── register.php               # POST API register (status=pending)
│   ├── session.php                # GET session check + CSRF token
│   └── logout.php                 # POST logout + activity logging
├── backend/controller/
│   ├── api/
│   │   ├── ruangan.php            # CRUD ruangan (create, join, syllabus, etc.)
│   │   ├── admin.php              # Admin: user mgmt, room stats, activity logs
│   │   └── quiz.php               # API kuis (submit jawaban, analytics)
│   └── logic/
│       ├── LoginRegisterLogic.php  # Auth business logic
│       ├── RuanganLogic.php        # Ruangan business logic
│       ├── RateLimiter.php         # Dual rate limiting (IP + session)
│       └── ActivityLogger.php      # Audit trail (login, logout, admin actions)
├── db/
│   ├── schema.sql                 # Full DB schema (8 tabel) + demo data
│   ├── migration.php              # CLI-only version-based migration
│   └── README.md                  # Arsitektur data documentation
├── storage/ruangan/               # File JSON silabus per ruangan (runtime)
├── assets/                        # Static assets (favicon, icons)
├── scripts/scan-secrets.sh        # Security: pre-commit secret scanning
├── hooks/pre-commit               # Git pre-commit hook
├── .github/workflows/             # CI: scan-secrets.yml
├── build.sh                       # Build frontend → copy to root XAMPP
├── source/                        # Referensi implementasi
└── README.md                      # Dokumentasi project ini
```

---

## 📋 Prasyarat

Sebelum memulai, pastikan Anda telah menginstal perangkat lunak berikut:

- **XAMPP/LAMPP** (Apache + MySQL) — [download](https://www.apachefriends.org/)
- **Node.js v18+** — [download](https://nodejs.org/)
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

# Windows (XAMPP)
# Copy folder ke C:\xampp\htdocs\FlacTopus
```

### 3. Setup Database

```bash
# Jalankan migrasi (CLI-only, otomatis buat tabel + data demo)
php db/migration.php
```

Atau manual via phpMyAdmin:
- Buka `http://localhost/phpmyadmin`
- Import `db/schema.sql`

### 4. Setup API Key AI (Opsional)

```bash
cd frontend
cp .env.example .env
# API key disimpan di auth/config.php (server-side, tidak di frontend)
```

> ⚠️ Tanpa API Key, aplikasi tetap berjalan dalam *mode simulasi* (AI tutor memberi respons placeholder).

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

> ℹ️ Di dev mode, panggilan auth (`/FlacTopus/auth/*`) di-proxy ke Apache.

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

### 3. Activity Logger (Audit Trail)
Semua aktivitas dicatat ke tabel `activity_log`: login, logout, register, approve, reject, change_role, delete_user, reset_password, rate_limited.

### 4. Secure Cookie
- `httponly = true` → JavaScript tidak bisa baca
- `samesite = 'Lax'` → cookie tidak dikirim saat cross-site
- `secure = dynamic` → otomatis `true` jika HTTPS

### 5. Security Headers

| Header | Fungsi |
| --- | --- |
| `X-Content-Type-Options: nosniff` | Cegah MIME sniffing |
| `X-Frame-Options: DENY` | Cegah clickjacking |
| `Referrer-Policy: strict-origin-when-cross-origin` | Kontrol referrer |
| `Permissions-Policy` | Blokir kamera, mikrofon, lokasi |
| `Cross-Origin-Opener-Policy: same-origin` | Isolasi origin |

### 6. User Approval Workflow
- Register → status `pending` → admin approve → status `active`
- User belum bisa login selama status `pending`

### 7. Input Validation & Protection
- Password: Bcrypt (`password_hash()` + `password_verify()`)
- CSRF: Token wajib untuk semua POST request (`X-CSRF-Token` header)
- SQL Injection: Prepared statements (PDO)
- Register: Role di-override server-side (selalu `student`)

---

## 👥 RBAC (Role-Based Access Control)

| Role | Deskripsi | Akses |
| --- | --- | --- |
| `guest` | Belum login | Landing page, login, register |
| `student` | Murid terdaftar (aktif) | Kelas yang diikuti, belajar, kuis |
| `teacher` | Guru terdaftar (aktif) | Semua akses student + buat/hapus ruangan, edit silabus |
| `admin` | Administrator (superuser) | **Akses penuh ke SEMUA** — lihat/hapus/edit semua ruangan guru, kelola user, panel admin |

### RBAC Detail per Aksi

| Aksi | Guest | Student | Teacher (pembuat) | Ketua Kelas | Admin |
| --- | --- | --- | --- | --- | --- |
| Lihat ruangan | ❌ | Ruangan diikuti | Ruangan sendiri | — | **SEMUA ruangan** |
| Buat ruangan | ❌ | ❌ | ✅ | ❌ | ✅ |
| Hapus ruangan | ❌ | ❌ | ✅ (sendiri) | ❌ | ✅ **semua** |
| Rename ruangan | ❌ | ❌ | ✅ (sendiri) | ❌ | ✅ **semua** |
| Edit silabus | ❌ | ❌ | ✅ (sendiri) | ❌ | ✅ **semua** |
| Lihat members | ❌ | ❌ | ✅ (sendiri) | ✅ (sendiri) | ✅ **semua** |
| Kick murid | ❌ | ❌ | ✅ (sendiri) | ❌ | ✅ **semua** |
| Set ketua kelas | ❌ | ❌ | ✅ (sendiri) | ❌ | ✅ **semua** |
| Mark/Pin murid | ❌ | ❌ | ✅ (sendiri) | ❌ | ✅ **semua** |
| Analytics | ❌ | ❌ | ✅ (sendiri) | ✅ (sendiri) | ✅ **semua** |
| Chat history | ❌ | ❌ | ✅ (sendiri) | ❌ | ✅ **semua** |
| Anti-cheat | ❌ | ❌ | ✅ (sendiri) | ✅ (sendiri) | ✅ **semua** |
| Panel admin | ❌ | ❌ | ❌ | ❌ | ✅ |

### Flow Autentikasi

1. User buka app → status `guest`
2. Register → **selalu role `student`** → status `pending`
3. Admin approve → status `active`
4. Login → session PHP dibuat (cookie `FlacTopus`, httponly, 2 jam lifetime)
5. **Session hijacking check** → setiap request cek `session_id()` di DB
6. React cek status via `auth/session.php` → tampilkan UI sesuai role
7. Idle 30 menit → auto-logout
8. **Double session prevention** → user sudah login → redirect ke `/classes`

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
| `theme_color` | VARCHAR(20) | Tema warna UI |
| `user_id` | INT UNSIGNED FK | Guru pembuat (CASCADE) |
| `created_at` | TIMESTAMP | Auto |
| `last_active_at` | TIMESTAMP | Reset timer 2 jam |

### Tabel `class_members`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK | Auto increment |
| `ruangan_id` | INT UNSIGNED FK | CASCADE |
| `user_id` | INT UNSIGNED FK | CASCADE |
| `role` | ENUM('member','admin') | Admin = Ketua Kelas |
| `joined_at` | TIMESTAMP | Auto |
| `last_seen_at` | TIMESTAMP | Heartbeat terakhir |
| `is_marked` | BOOLEAN | Tanda khusus murid |
| `pinned_at` | TIMESTAMP | Waktu dipin |

### Tabel `quiz_attempts`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK | Auto increment |
| `ruangan_id` | INT UNSIGNED FK | Kelas tempat kuis |
| `user_id` | INT UNSIGNED FK | Murid yang mengerjakan |
| `node_id` | VARCHAR(100) | ID node Skill Tree |
| `node_label` | VARCHAR(200) | Judul node |
| `score` | TINYINT UNSIGNED | Nilai 0-100 |
| `total_questions` | TINYINT UNSIGNED | Total soal |
| `correct_answers` | TINYINT UNSIGNED | Jawaban benar |
| `wrong_answers` | TEXT NULL | JSON pertanyaan salah |
| `created_at` | TIMESTAMP | Auto |

### Tabel `login_attempts` | `activity_log` | `schema_version`
Tabel pendukung untuk rate limiting, audit trail, dan migrasi.

> **Catatan desain:** Isi skill tree (nodes/edges) disimpan sebagai **file JSON per ruangan** di `storage/ruangan/`, bukan di kolom DB. DB hanya menyimpan pointer kecil.

---

## 🔧 API Endpoints

### Auth (`auth/*.php`)
| Endpoint | Method | Deskripsi |
| --- | --- | --- |
| `auth/session.php` | GET | Cek status login + ambil CSRF token |
| `auth/login.php` | POST | Login + dual rate limiter |
| `auth/register.php` | POST | Register → status=pending |
| `auth/logout.php` | POST | Logout + activity logging |

### Ruangan (`backend/controller/api/ruangan.php`)
| Aksi | Method | Role | Deskripsi |
| --- | --- | --- | --- |
| `list` | GET | Semua (login) | Daftar ruangan (admin lihat **SEMUA**, guru lihat sendiri) |
| `create` | POST | teacher/admin | Buat ruangan baru |
| `join` | POST | student/admin | Gabung via kode 6 karakter |
| `delete` | POST | pemilik + admin | Hapus ruangan permanen (admin bisa hapus ruangan guru) |
| `rename` | POST | pemilik + admin | Ubah nama ruangan |
| `kick` | POST | pemilik + admin | Keluarkan murid |
| `set_admin` | POST | pemilik + admin | Atur ketua kelas |
| `toggle_mark` | POST | pemilik + admin | Tandai murid |
| `toggle_pin` | POST | pemilik + admin | Pin murid |
| `touch` | POST | anggota + admin | Keep-alive |
| `syllabus` | GET/POST | anggota + pemilik + admin | Baca/simpan skill tree |
| `heartbeat` | POST | anggota + admin | Keep-alive |

### Admin (`backend/controller/api/admin.php`)
| Aksi | Method | Role | Deskripsi |
| --- | --- | --- | --- |
| `list` | GET | admin | Daftar semua user + filter |
| `stats` | GET | admin | Statistik user per role & status |
| `room_stats` | GET | admin | Statistik ruangan real-time |
| `approve` | POST | admin | Setujui user pending |
| `reject` | POST | admin | Tolak user pending |
| `change_role` | POST | admin | Ubah role user |
| `delete` | POST | admin | Hapus user permanen |
| `reset_password` | POST | admin | Reset password user |
| `activity_logs` | GET | admin | Audit trail + filter + pagination |
| `activity_stats` | GET | admin | Statistik activity log |
| `kick` | POST | admin | Keluarkan anggota dari ruangan |

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
# 📋 Migrasi v1: Tabel users, ruangan, class_members, syllabus
# 📋 Migrasi v2: Tabel login_attempts
# 📋 Migrasi v3: Tabel activity_log
# ✅ Database sudah versi terbaru (v3).
```

| Fitur | Keterangan |
| --- | --- |
| CLI Only | `PHP_SAPI !== 'cli'` → 403 Forbidden di browser |
| Version-based | Tabel `schema_version` lacak versi |
| Idempotent | Bisa dijalankan berulang kali tanpa error |
| Safe | Tidak DROP/DELETE data yang ada |

---

## 🤝 Kontribusi

Kontribusi selalu terbuka! Silakan ikuti langkah berikut:

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
- **Register:** Selalu role `student` — guru/admin ditambahkan via Panel Admin

---

*Project ini dikembangkan untuk kompetisi **OSCAR 3.0 Web Development Competition** oleh tim yang beranggotakan 3 orang siswa SMKTI Dwiguna.*

