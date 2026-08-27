# backend/

**PHP = backend murni** — autentikasi, otorisasi (RBAC), dan logika bisnis
ruangan/silabus dilayani oleh PHP; React (frontend) hanya menggambar UI dan
memanggil API JSON. Status lama "placeholder / belum ada backend" **tidak
berlaku lagi**.

## Struktur

| Folder | Isi |
| --- | --- |
| `backend/controller/api/` | Endpoint publik (boleh diakses web): `ruangan.php` — CRUD ruangan, gabung via kode, kelola murid, heartbeat, silabus |
| `backend/controller/logic/` | Logika bisnis: `RuanganLogic.php`, `LoginRegisterLogic.php` — **diblokir akses langsung** oleh `.htaccess` root |
| `auth/` (folder di root project, di luar `backend/`) | Autentikasi & session: `login.php`, `register.php`, `logout.php`, `session.php` (status login/CSRF), `config.php` (koneksi DB + session) |

## Alur

1. React memanggil `auth/session.php` untuk cek status login (sumber kebenaran
   ada di server) — hook `frontend/src/hooks/useAuth.js`.
2. Login/register → `auth/login.php` / `auth/register.php` (session PHP,
   cookie `PLomba` dengan path `/FlacTopus`).
3. Data ruangan & silabus → `backend/controller/api/ruangan.php` (wajib login;
   POST wajib header `X-CSRF-Token`; RBAC per aksi).

Arsitektur data lengkap (MySQL + file silabus per ruangan) ada di
`db/README.md`; alur aplikasi & RBAC di README utama.
