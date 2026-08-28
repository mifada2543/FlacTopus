# 📋 Changelog Project — FlacTopus AI

**Judul:** Sistem Pendidikan Adaptif "Rainforest of Innovation"
**Lomba:** OSCAR 3.0 x GDGOC STT NF — Web Development Competition
**Deadline:** 30 Agustus 2026, 21.00 WIB
**Babak Final:** 6 September 2026, STT Terpadu Nurul Fikri
**Live:** https://meel.web.id/

---

## 📝 Daftar Perubahan (Changelog)

### 🔐 Backend — Soft Delete Ruangan & Peran Admin (28 Agustus 2026 — Sesi 3)

**Tujuan:** Admin hanya mengelola ruangan terhapus (backup/recovery), bukan mengelola ruangan aktif guru (privasi).

#### Database
| Item | Status | Keterangan |
| --- | --- | --- |
| `ruangan.deleted_at` | ✅ Ditambahkan | `TIMESTAMP NULL` — soft delete timestamp |
| `ruangan.deleted_by` | ✅ Ditambahkan | `INT UNSIGNED NULL` — ID user yang menghapus |
| `schema_version` | ✅ Updated | v6 |

#### Backend (PHP)
| File | Perubahan |
| --- | --- |
| `RuanganLogic.php` | `delete()` → **soft delete** (set `deleted_at`, bukan hard delete) |
| `RuanganLogic.php` | `restore()` → **baru** — admin pulihkan ruangan dari trash |
| `RuanganLogic.php` | `forceDelete()` → **baru** — admin hard delete permanen dari trash |
| `RuanganLogic.php` | `listTrashed()` → **baru** — admin lihat semua ruangan terhapus + sisa hari |
| `RuanganLogic.php` | `listForUser()` → admin tidak melihat ruangan guru (privacy) |
| `RuanganLogic.php` | `join()` → blokir gabung ke ruangan yang sudah dihapus |
| `ruangan.php` | GET `?action=trash` → admin-only: daftar ruangan terhapus |
| `ruangan.php` | POST `restore` → admin pulihkan ruangan |
| `ruangan.php` | POST `force_delete` → admin hapus permanen |
| `admin.php` | POST `restore` → handler restore via admin API |
| `admin.php` | POST `force_delete` → handler force delete via admin API |
| `admin.php` | Hapus endpoint `room_stats` (dead code) |
| `GarbageCollector.php` | `cleanExpiredTrash()` → hard delete ruangan `deleted_at` > 30 hari |

#### Frontend (React)
| File | Perubahan |
| --- | --- |
| `AdminPanel.jsx` | Tab "Kelola Ruangan" → **"Ruangan Terhapus"** |
| `AdminPanel.jsx` | Hanya tampilkan ruangan soft-deleted (bukan semua ruangan) |
| `AdminPanel.jsx` | Tombol **"Pulihkan"** & **"Hapus Permanen"** (bukan Detail/Kick) |
| `AdminPanel.jsx` | Info banner: "Data akan dihapus permanen setelah 30 hari" |
| `AdminPanel.jsx` | Countdown **"Sisa Hari"** per ruangan |
| `AdminPanel.jsx` | Tambah tombol **Logout** di header |
| `AdminPanel.jsx` | Tambah **nama admin** di header (`👋 Nama Admin`) |
| `AdminPanel.jsx` | Hapus tombol "Kembali" (admin tidak perlu ke `/classes`) |
| `Login.jsx` | Admin redirect ke `/admin` setelah login (bukan `/classes`) |
| `auth/auth.php` | `require_guest()` → admin redirect ke `/admin` |

---

### 🗃️ Backend — Database Migration v4-v6 & Quiz Attempts (28 Agustus 2026 — Sesi 2)

**Tujuan:** Fix error "Unknown column 'theme_color'" dan "Table 'quiz_attempts' doesn't exist" saat guru membuat kelas.

#### Database
| Item | Status | Keterangan |
| --- | --- | --- |
| `ruangan.theme_color` | ✅ Ditambahkan | `VARCHAR(50) DEFAULT '#0f172a'` |
| `class_members.role` | ✅ Ditambahkan | `ENUM('member','admin') DEFAULT 'member'` |
| `class_members.is_marked` | ✅ Ditambahkan | `TINYINT(1) DEFAULT 0` |
| `class_members.pinned_at` | ✅ Ditambahkan | `TIMESTAMP NULL` |
| `quiz_attempts` | ✅ Dibuat | Tabel baru: rekam jawaban murid (score, wrong_answers, tab_switches) |
| `schema_version` | ✅ Updated | v4 (kolom), v5 (quiz_attempts), v6 (soft delete) |

#### Migration (`db/migration.php`)
| Versi | Deskripsi |
| --- | --- |
| v4 | Tambah kolom `theme_color` (ruangan), `role`/`is_marked`/`pinned_at` (class_members) |
| v5 | Buat tabel `quiz_attempts` (rekam jawaban murid) |
| v6 | Tambah kolom `deleted_at`, `deleted_by` ke `ruangan` (soft delete) |

---

### 🚀 Deployment — Cloudflare Tunnel & Production Config (28 Agustus 2026 — Sesi 1)

**Tujuan:** Deploy ke production via Cloudflare Tunnel di `meel.web.id`.

#### Konfigurasi
| Item | Perubahan |
| --- | --- |
| `auth/config.php` | `BASE_URL = 'https://meel.web.id'` |
| `vite.config.js` | `base: '/'` (production) |
| `.htaccess` | CSP: allow `https://static.cloudflareinsights.com` |
| `.htaccess` | SPA routing + `RewriteBase /` |
| `App.jsx` | `basename="/"` (Router) |
| `build.sh` | Copy file dari `frontend/public/` + hapus `.htaccess` yang memblokir |

#### Frontend
| File | Perubahan |
| --- | --- |
| `templateLibrary.js` | Hapus prefix `/FlacTopus/` dari image paths |
| `QuizTypeModal.jsx` | Hapus prefix `/FlacTopus/` dari image paths |
| `api.js` | `RUANGAN_API` & `AUTH_API` pakai `import.meta.env.BASE_URL` |

---

### 🔐 Security Audit — Prepared Statements (28 Agustus 2026)

**Tujuan:** Pastikan semua query DB menggunakan prepared statements, tidak ada SQL injection vector.

| File | Perubahan |
| --- | --- |
| `RateLimiter.php` | `$this->db->exec()` → `prepare()` + `execute()` |
| `ActivityLogger.php` | Tambah comment penjelas untuk LIMIT/OFFSET `(int)` cast |
| `db/migration.php` | Tambah `sanitizeId()` regex `[^a-zA-Z0-9_]` untuk raw queries |
| `db/migration.php` | Tambah `preg_replace` sanitasi untuk `$dbName` |

**Hasil Audit:**
- ✅ Tidak ada `$_GET` / `$_POST` langsung di SQL
- ✅ Tidak ada string concat di `exec()` / `query()` (sudah di-fix)
- ✅ `EMULATE_PREPARES => false` aktif di `config.php`
- ✅ Semua query DB backend sudah prepared statements

---

### 🐛 Bug Fixes (28 Agustus 2026)

| Masalah | Penyebab | Fix |
| --- | --- | --- |
| Guru gagal buat kelas | Kolom `theme_color` hilang dari tabel `ruangan` | Ditambah via ALTER TABLE + migration v4 |
| "Gagal memuat data kuis" | Tabel `quiz_attempts` tidak ada | Dibuat dengan struktur lengkap + migration v5 |
| Halaman kosong di `meel.web.id` | Base path `/FlacTopus/` tidak cocok dengan production | `base: '/'` + hapus prefix di image paths |
| CSP block Cloudflare beacon | `script-src 'self'` memblokir Cloudflare analytics | Tambah `https://static.cloudflareinsights.com` ke CSP |
| Router basename error | `basename="/FlacTopus"` hardcoded di App.jsx | Diubah ke `basename="/"` |
| Logo tidak muncul | Cloudflare cache serve response lama (535 bytes HTML) | User purge Cloudflare cache |
| `.htaccess` memblokir assets | `frontend/public/.htaccess` tertimpa ke root via rsync | `build.sh` hapus `.htaccess` dari public folder copy |
| Admin bisa kelola ruangan guru | `listForUser()` untuk admin return SEMUA ruangan | Admin return `[]` (privacy), hanya akses via trash |

---

### 🔐 Keamanan yang Diimplementasikan

| # | Fitur | Status |
| --- | --- | --- |
| 1 | Session Hijacking Detection | ✅ `last_session_id` di tabel users |
| 2 | Dual Rate Limiting (IP + Session) | ✅ Login: 5/15menit, Register: 3/1jam |
| 3 | Activity Logger (Audit Trail) | ✅ Semua aksi dicatat |
| 4 | Secure Cookie | ✅ httponly, samesite=Lax, secure=dynamic |
| 5 | Security Headers | ✅ nosniff, DENY, CORS, HSTS |
| 6 | User Approval Workflow | ✅ Register → pending → admin approve |
| 7 | CSRF Protection | ✅ Token wajib untuk semua POST |
| 8 | SQL Injection Prevention | ✅ Prepared statements (PDO) |
| 9 | Soft Delete Ruangan | ✅ 30 hari retention, admin bisa restore |
| 10 | Admin Privacy | ✅ Admin tidak lihat ruangan aktif guru |
| 11 | Garbage Collector | ✅ Hard delete trashed rooms > 30 hari |
| 12 | Admin Redirect | ✅ Login → `/admin` langsung |
| 13 | Logout di Admin Panel | ✅ Tombol keluar + nama admin di header |

---

## 🗃️ Database Schema (Final — v6)

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

### Tabel `syllabus`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK | Auto increment |
| `ruangan_id` | INT UNSIGNED FK | UNIQUE, CASCADE |
| `file_path` | VARCHAR(255) | Pointer ke `storage/ruangan/<id>.json` |
| `updated_at` | TIMESTAMP | Auto update |

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

### Tabel `login_attempts`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK | Auto increment |
| `ip_address` | VARCHAR(45) | IPv4 atau IPv6 |
| `context` | VARCHAR(20) | 'login' atau 'register' |
| `attempted_at` | TIMESTAMP | Auto |

### Tabel `activity_log`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK | Auto increment |
| `user_id` | INT UNSIGNED FK NULL | NULL = system event |
| `action` | VARCHAR(100) | login, logout, approve_user, dll. |
| `ip_address` | VARCHAR(45) | IP pelaku |
| `user_agent` | VARCHAR(255) | Browser/device info |
| `created_at` | TIMESTAMP | Auto |

### Tabel `schema_version`
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `version` | INT PK | Nomor versi migrasi |
| `description` | VARCHAR(255) | Deskripsi migrasi |
| `applied_at` | TIMESTAMP | Kapan dijalankan |

---

## 👥 RBAC (Role-Based Access Control — Updated)

| Role | Deskripsi | Akses |
| --- | --- | --- |
| `guest` | Belum login | Landing page, login, register |
| `student` | Murid terdaftar (aktif) | Kelas yang diikuti, belajar, kuis |
| `teacher` | Guru terdaftar (aktif) | Semua akses student + buat/hapus ruangan, edit silabus |
| `admin` | Administrator | Kelola user, pulihkan ruangan terhapus, activity log |

### RBAC Detail per Aksi (Updated)

| Aksi | Guest | Student | Teacher (pembuat) | Ketua Kelas | Admin |
| --- | --- | --- | --- | --- | --- |
| Lihat ruangan | ❌ | Ruangan diikuti | Ruangan sendiri | — | ❌ (privacy) |
| Buat ruangan | ❌ | ❌ | ✅ | ❌ | ❌ |
| Hapus ruangan | ❌ | ❌ | ✅ (soft delete sendiri) | ❌ | ❌ |
| Rename ruangan | ❌ | ❌ | ✅ (sendiri) | ❌ | ❌ |
| Edit silabus | ❌ | ❌ | ✅ (sendiri) | ❌ | ❌ |
| Lihat members | ❌ | ❌ | ✅ (sendiri) | ✅ (sendiri) | ❌ |
| Kick murid | ❌ | ❌ | ✅ (sendiri) | ❌ | ❌ |
| Set ketua kelas | ❌ | ❌ | ✅ (sendiri) | ❌ | ❌ |
| Mark/Pin murid | ❌ | ❌ | ✅ (sendiri) | ❌ | ❌ |
| Analytics | ❌ | ❌ | ✅ (sendiri) | ✅ (sendiri) | ❌ |
| Chat history | ❌ | ❌ | ✅ (sendiri) | ❌ | ❌ |
| Anti-cheat | ❌ | ❌ | ✅ (sendiri) | ✅ (sendiri) | ❌ |
| **Kelola User** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Lihat Ruangan Terhapus** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Restore Ruangan** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Force Delete Ruangan** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Activity Log** | ❌ | ❌ | ❌ | ❌ | ✅ |

### Flow Soft Delete Ruangan
```
Guru hapus ruangan → Soft delete (deleted_at terisi)
        ↓
Admin lihat di tab "Ruangan Terhapus"
        ↓
Guru req ke admin → Admin klik "Pulihkan" → Ruangan aktif kembali
        ↓
atau: Setelah 30 hari → GarbageCollector hard delete permanen
```

### Flow Autentikasi
1. User buka app → status `guest`
2. Register → **selalu role `student`** → status `pending`
3. Admin approve → status `active`
4. Login → **admin redirect ke `/admin`**, guru/murid redirect ke `/classes`
5. Session PHP dibuat (cookie `FlacTopus`, httponly, 2 jam lifetime)
6. Session hijacking check → setiap request cek `session_id()` di DB
7. Idle 30 menit → auto-logout
8. Double session prevention → user sudah login → redirect

---

## 🔧 API Endpoints (Updated)

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
| `list` | GET | teacher/student | Daftar ruangan aktif (admin return kosong) |
| `trash` | GET | admin | Daftar ruangan terhapus + sisa hari |
| `create` | POST | teacher | Buat ruangan baru |
| `join` | POST | student | Gabung via kode 6 karakter |
| `delete` | POST | pemilik | **Soft delete** ruangan (30 hari retention) |
| `restore` | POST | admin | Pulihkan ruangan dari trash |
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
| `approve` | POST | admin | Setujui user pending |
| `reject` | POST | admin | Tolak user pending |
| `change_role` | POST | admin | Ubah role user |
| `delete` | POST | admin | Hapus user permanen |
| `reset_password` | POST | admin | Reset password user |
| `kick` | POST | admin | Keluarkan anggota dari ruangan |
| `restore` | POST | admin | Pulihkan ruangan dari trash |
| `force_delete` | POST | admin | Hapus permanen ruangan dari trash |
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

## 📁 Struktur Project (Updated)

```
FlacTopus/
├── frontend/                  # React app (Vite)
│   ├── src/
│   │   ├── pages/             # Landing, Login, Register, ClassDashboard,
│   │   │                      # TeacherDashboard, StudentDashboard, Quiz,
│   │   │                      # RoomDetail, AdminPanel (3 tabs), ErrorPage
│   │   ├── components/        # ProtectedRoute, quiz/*, analytics/*
│   │   ├── hooks/             # useAuth (session PHP), useRoomHeartbeat
│   │   ├── utils/             # api.js, roles.js, aiService.js, sounds.js
│   │   ├── data/              # mockData.js, templateLibrary.js
│   │   ├── App.jsx            # Route definitions + RBAC matrix
│   │   └── index.css          # CSS variables, dark theme, responsive
│   ├── vite.config.js         # base: '/' (production)
│   └── (no .env — API key server-side di auth/config.php)
├── auth/                      # PHP auth backend
│   ├── config.php             # DB, session config, security headers, GEMINI_API_KEY
│   ├── auth.php               # require_auth, session hijacking, CSRF, RBAC
│   ├── login.php              # POST API login + dual rate limiter
│   ├── register.php           # POST API register (status=pending)
│   ├── session.php            # GET session check + CSRF token
│   ├── logout.php             # POST logout + activity logging
│   └── config.example.php     # Template config (committed)
├── backend/controller/
│   ├── api/
│   │   ├── ruangan.php        # CRUD ruangan + trash management
│   │   ├── admin.php          # Admin: user mgmt, restore/force_delete, activity logs
│   │   ├── quiz.php           # API kuis + analytics + anti-cheat
│   │   ├── gemini.php         # Backend proxy Gemini API
│   │   ├── nilai-input.php    # Input nilai
│   │   └── csrf.php           # CSRF token endpoint
│   ├── logic/
│   │   ├── LoginRegisterLogic.php  # Auth business logic
│   │   ├── RuanganLogic.php        # Ruangan + soft delete + trash management
│   │   ├── RateLimiter.php         # Dual rate limiting (IP + session)
│   │   ├── ActivityLogger.php      # Audit trail (login, logout, admin actions)
│   │   └── GarbageCollector.php    # Auto-clean: activity_log, orphaned files, trashed rooms
│   └── autoloader.php
├── db/
│   ├── migration.php          # CLI-only version-based migration (v1-v6)
│   └── README.md              # Arsitektur data documentation
├── storage/
│   ├── ruangan/               # File JSON silabus per ruangan
│   ├── chat/                  # File JSON riwayat chat AI per murid
│   ├── .gc_last_run           # Timestamp GC terakhir
│   └── gc.log                 # Log Garbage Collector
├── scripts/
│   ├── gc.php                 # CLI manual trigger untuk Garbage Collector
│   └── scan-secrets.sh        # Security: pre-commit secret scanning
├── hooks/pre-commit           # Git pre-commit hook
├── .github/workflows/         # CI: scan-secrets.yml
├── build.sh                   # Build frontend → copy to root XAMPP
├── info.md                    # Changelog project ini
└── README.md                  # Main project documentation
```

---

## 📊 Status Deployment

| Item | Status |
| --- | --- |
| Live URL | https://meel.web.id/ |
| Cloudflare Tunnel | ✅ Aktif (tunnel ID: 0a37adbc) |
| Apache Vhost | ✅ Route `meel.web.id` → `/opt/lampp/htdocs/FlacTopus` |
| MySQL | ✅ Running (port 3306) |
| Database | ✅ `project_lomba` (v6, 8 tabel) |
| Node.js | ✅ v22 (via nvm) |
| Config | ✅ `auth/config.php` (BASE_URL = https://meel.web.id) |

### Akun Demo
| Akun | Email | Password | Role | Status |
| --- | --- | --- | --- | --- |
| Admin | admin@example.com | password123 | admin | active |
| Guru | guru@example.com | password123 | teacher | active |
| Murid | murid@example.com | password123 | student | active |

---

*Terakhir diupdate: 28 Agustus 2026*
