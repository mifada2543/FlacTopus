# db/

Dokumentasi arsitektur data aplikasi.

## Arsitektur data (keputusan desain)

| Jenis data                     | Penyimpanan                         |
| ------------------------------ | ----------------------------------- |
| User (guru & murid)            | **MySQL** — tabel `users`           |
| Ruangan (kelas yang dibuat guru) | **MySQL** — tabel `ruangan`       |
| Silabus / skill tree per ruangan | **File JSON** di `storage/ruangan/<id>.json` (DB hanya pointer kecil di `syllabus`) |
| Murid yang bergabung ke ruangan | **MySQL** — tabel `class_members` (dipakai ulang) |
| Riwayat belajar & nilai        | **File JSON di `upload/`** (dibaca halaman `admin/`) |

> 📌 **Perubahan konsep:** tabel `classes` diganti **`ruangan`**. Ruangan punya
> siklus hidup: **otomatis terhapus (hard delete) setelah 2 jam tanpa
> penggunaan** — `last_active_at` di-refresh oleh aktivitas siapa pun
> (membuka / bergabung ke ruangan). Hanya **guru pembuat** (atau admin) yang
> bisa menghapus manual.

## Skema MySQL

File import: **`db/schema.sql`** (database `project_lomba`, 4 tabel + data demo).

### Cara import (phpMyAdmin)

1. Buka `http://localhost/phpmyadmin`
2. Menu **Import** → pilih file `db/schema.sql` → klik **Import**

Atau via terminal:

```bash
/opt/lampp/bin/mysql -u root < db/schema.sql
```

### Tabel

**`users`** — guru & murid
| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK AUTO_INCREMENT | |
| `name` | VARCHAR(100) | |
| `email` | VARCHAR(150) UNIQUE | dipakai login |
| `password_hash` | VARCHAR(255) | bcrypt (`password_hash()` PHP) |
| `role` | ENUM('student','teacher','admin') | `guest` tidak disimpan di DB (belum login) |
| `created_at` | TIMESTAMP | |

**`ruangan`** — ruangan kelas (pemilik: guru pembuat)
| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK AUTO_INCREMENT | |
| `nama` | VARCHAR(150) | nama ruangan / mapel |
| `kode_ruangan` | CHAR(6) UNIQUE | kode join murid (6 karakter, tanpa O/0/I/1) |
| `user_id` | INT UNSIGNED FK → `users.id` | guru pembuat (CASCADE) |
| `created_at` | TIMESTAMP | tanggal pembuatan |
| `last_active_at` | TIMESTAMP | **reset hitung mundur 2 jam** — di-refresh saat ada aktivitas (`touch`/`join`) |

⚠️ **Expiry:** pada setiap operasi (terutama `list`), ruangan dengan
`last_active_at < NOW() - 2 JAM` dihapus permanen (`RuanganLogic::purgeExpired()`),
anggota & silabus ikut terhapus via FK CASCADE.

**`class_members`** — murid yang bergabung (tabel lama dipakai ulang; kini mengacu ke `ruangan.id`)
| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK AUTO_INCREMENT | |
| `ruangan_id` | INT UNSIGNED FK → `ruangan.id` | CASCADE |
| `user_id` | INT UNSIGNED FK → `users.id` | CASCADE |
| `joined_at` | TIMESTAMP | UNIQUE(`ruangan_id`,`user_id`) |

**`syllabus`** — pointer ke file build silabus per ruangan (satu baris per ruangan)
| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | INT UNSIGNED PK AUTO_INCREMENT | |
| `ruangan_id` | INT UNSIGNED FK → `ruangan.id` UNIQUE | CASCADE |
| `file_path` | VARCHAR(255) | lokasi file build, `storage/ruangan/<id>.json` |
| `updated_at` | TIMESTAMP | auto-update |

> 📌 **Keputusan desain:** isi skill tree (nodes/edges) **TIDAK disimpan di
> DB** agar database tidak membawa karakter yang sangat panjang (terutama
> media gambar base64). Build disimpan sebagai **file JSON per ruangan** di
> `storage/ruangan/<ruangan_id>.json`; DB cuma menyimpan pointer kecil.
> Folder `storage/` di-deny oleh `.htaccess` (tidak bisa diakses browser),
> dan file `*.json` runtime di-ignore git. Saat ruangan dihapus/kedaluwarsa,
> file build-nya ikut dihapus (`RuanganLogic::delete()` / `purgeExpired()`).
>
> ⚠️ **Setelah clone/instalasi baru:** pastikan folder `storage/` writable
> oleh user Apache (di XAMPP worker-nya `daemon`), mis.:
> ```bash
> chmod -R 777 storage
> ```
> Tanpa ini, simpan silabus akan gagal dengan pesan "Gagal menulis file silabus".

Bentuk `nodes`/`edges` dalam file identik dengan struktur yang dipakai
`frontend/src/data/mockData.js`. Frontend memakai API (`GET action=syllabus`)
— kontrak `{ nodes, edges, nama, updated_at }` tidak berubah, jadi UI tidak
perlu tahu apakah isi berasal dari DB atau file.

### API ruangan (PHP)

Endpoint: `backend/controller/api/ruangan.php` (wajib login; POST wajib `X-CSRF-Token`).

| Method | Aksi | Role | Keterangan |
| --- | --- | --- | --- |
| `GET` | `list` | semua (login) | daftar sesuai role + sisa waktu sebelum kedaluwarsa |
| `POST` | `create` | guru/admin | buat ruangan, `{ "action":"create", "nama":"..." }` |
| `POST` | `join` | murid/admin | gabung via kode, `{ "action":"join", "kode_ruangan":"TREE01" }` |
| `POST` | `delete` | pemilik/admin | hapus permanen, `{ "action":"delete", "id":3 }` |
| `POST` | `touch` | anggota/pemilik | reset timer 2 jam, `{ "action":"touch", "id":3 }` |
| `GET` | `syllabus` | anggota/pemilik/admin | baca silabus, `?action=syllabus&id=3` |
| `POST` | `syllabus` | pemilik/admin | simpan build ke file, `{ "action":"syllabus", "id":3, "nodes":[...], "edges":[...] }` |

### Data demo (dari `schema.sql`)

| Akun | Email | Password | Role |
| --- | --- | --- | --- |
| Guru | `guru@example.com` | `password123` | teacher |
| Murid | `murid@example.com` | `password123` | student |
| Admin | `admin@example.com` | `password123` | admin |

Ruangan demo: `TREE01` — *Kelas Demo — Dasar Pemrograman C++* (silabus 3 node + 2 edge).

> ⚠️ RE-IMPORT `schema.sql` akan **menghapus & membuat ulang** keempat tabel
> (DROP IF EXISTS). Jangan jalankan ulang jika sudah ada data nyata.

### Catatan teknis (MariaDB/XAMPP)

- Isi build (nodes/edges) kini di file JSON, bukan kolom DB — jadi tidak ada
  lagi kekhawatiran kolom JSON/LONGTEXT membengkak oleh base64 media.
  PHP tetap mem-validasi JSON saat membaca file:
  ```php
  $raw = json_decode(file_get_contents($file), true);
  if (!is_array($raw)) { /* file korup → anggap kosong */ }
  ```
- `ruangan.id` adalah INT internal; **`kode_ruangan` (6 karakter) adalah ID
  publik** untuk join murid. URL dashboard React memakai `ruangan.id`
  (`/teacher/{id}`, `/student/{id}`).
- Saat murid/owner **membuka** ruangan, React mengirim `touch` → server
  memperbarui `last_active_at` (aktivitas = reset timer 2 jam).
