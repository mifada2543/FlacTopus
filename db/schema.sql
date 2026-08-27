-- ============================================================
-- db/schema.sql - Skema Database MySQL untuk FlacTopus
-- ============================================================
-- ARSITEKTUR DAN KONTEKS PROJECT (PANDUAN UNTUK AI & DEVELOPER):
-- 
-- 1. Arsitektur Umum:
--    - Frontend: React (Vite) - Single Page Application (SPA).
--    - Backend: PHP murni berbasis API (tanpa framework). File PHP di folder backend/ bertugas me-return JSON.
--    - Konsep Autentikasi: Menggunakan Session PHP (PHPSESSID) + proteksi Anti-CSRF via token X-CSRF-Token di Header.
-- 
-- 2. Konsep Domain Utama:
--    - Users: Dibagi menjadi 'teacher' (Guru) dan 'student' (Murid).
--    - Ruangan (Classroom): Entitas kelas virtual yang dibuat Guru. Punya kode unik 6 karakter untuk join.
--    - Class Members: Relasi Many-to-Many antara Murid dan Ruangan. Role bisa 'member' atau 'admin' (Ketua Kelas).
--    - Syllabus (Skill Tree): Disimpan dalam file JSON statis di folder 
uang/ (bukan di database) untuk kemudahan manajemen struktur Tree (React Flow).
--    - Quiz Attempts: Rekaman nilai murid per Node/Materi. Dipakai untuk menghitung analitik kelas secara agregat. 
Ada UNIQUE constraint (ruangan_id, user_id, node_id) untuk mencegah 1 murid mensubmit nilai ganda di node yang sama.
--
-- 3. Panduan Kustomisasi:
--    - Jika menambah fitur, usahakan tidak mengubah arsitektur autentikasi session yang sudah matang.
--    - Tabel dirancang sesimpel mungkin. Modifikasi struktur quiz_attempts harus memperhatikan fitur Analitik di TeacherDashboard.
-- ============================================================
CREATE DATABASE IF NOT EXISTS project_lomba
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE project_lomba;

-- ------------------------------------------------------------
-- Urutan drop: dependensi paling dalam dulu
-- ------------------------------------------------------------
DROP TABLE IF EXISTS quiz_attempts;
DROP TABLE IF EXISTS syllabus;
DROP TABLE IF EXISTS class_members;
DROP TABLE IF EXISTS ruangan;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS users;

-- ------------------------------------------------------------
-- 1) users — guru & murid
-- ------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('student','teacher','admin') NOT NULL DEFAULT 'student',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB COMMENT='Guru & murid';

-- ------------------------------------------------------------
-- 2) ruangan — kelas yang dibuat guru
--    (nama ruangan/mapel, kode 6 karakter untuk join murid,
--     guru pembuat, tanggal pembuatan, aktivitas terakhir)
--    * Ruangan bersifat PERMANEN (tidak dihapus otomatis).
--      last_active_at hanya digunakan sebagai log aktivitas terakhir.
-- ------------------------------------------------------------
CREATE TABLE ruangan (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama           VARCHAR(150) NOT NULL,
  kode_ruangan   CHAR(6)      NOT NULL,
  theme_color    VARCHAR(20)  NOT NULL DEFAULT '#0f172a' COMMENT 'Tema warna UI',
  user_id        INT UNSIGNED NOT NULL COMMENT 'Guru pembuat ruangan',
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                              COMMENT 'Reset hitung mundur 2 jam',
  PRIMARY KEY (id),
  UNIQUE KEY uq_ruangan_kode (kode_ruangan),
  KEY idx_ruangan_guru (user_id),
  CONSTRAINT fk_ruangan_guru FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Ruangan kelas (guru = pembuat; permanen)';

-- ------------------------------------------------------------
-- 3) class_members — murid yang bergabung ke ruangan
--    (tabel lama dipakai ulang; kini mengacu ke ruangan.id)
-- ------------------------------------------------------------
CREATE TABLE class_members (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ruangan_id   INT UNSIGNED NOT NULL,
  user_id      INT UNSIGNED NOT NULL,
  role         ENUM('member', 'admin') NOT NULL DEFAULT 'member' COMMENT 'Admin = Ketua Kelas',
  joined_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP    NULL DEFAULT NULL
               COMMENT 'Heartbeat: kapan terakhir browser murid menjawab "ada orang disini"',
  is_marked    BOOLEAN      NOT NULL DEFAULT 0 COMMENT 'Tandai murid (dapat badge)',
  pinned_at    TIMESTAMP    NULL DEFAULT NULL COMMENT 'Waktu dipin, untuk urutan teratas',
  PRIMARY KEY (id),
  UNIQUE KEY uq_class_member (ruangan_id, user_id),
  KEY idx_members_user (user_id),
  CONSTRAINT fk_members_ruangan FOREIGN KEY (ruangan_id)
    REFERENCES ruangan (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_members_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Murid yang bergabung ke ruangan';

-- ------------------------------------------------------------
-- 4) syllabus — POINTER ke file build silabus per ruangan
--    Isi skill tree (nodes/edges ReactFlow) TIDAK disimpan di kolom DB
--    agar database tidak membawa karakter yang sangat panjang.
--    Build disimpan sebagai file JSON per ruangan di:
--      storage/ruangan/<ruangan_id>.json   (luar DB, di-deny .htaccess)
--    Tabel ini hanya menyimpan pointer kecil: file_path + updated_at.
--    Catatan: pada instalasi baru, ruangan belum punya file → frontend
--    menampilkan template sampai guru menyimpan (file dibuat saat itu).
-- ------------------------------------------------------------
CREATE TABLE syllabus (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ruangan_id  INT UNSIGNED NOT NULL,
  file_path   VARCHAR(255) NOT NULL
              COMMENT 'Lokasi file JSON build (storage/ruangan/<id>.json)',
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                           ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_syllabus_ruangan (ruangan_id),
  CONSTRAINT fk_syllabus_ruangan FOREIGN KEY (ruangan_id)
    REFERENCES ruangan (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Pointer ke file build silabus per ruangan';

-- ------------------------------------------------------------
-- 5) quiz_attempts — rekaman jawaban kuis murid
--    Setiap kali murid menyelesaikan kuis di suatu node Skill Tree,
--    satu baris dicatat di sini. Guru bisa melihat rata-rata nilai,
--    soal tersulit, dan leaderboard dari data ini.
-- ------------------------------------------------------------
CREATE TABLE quiz_attempts (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ruangan_id   INT UNSIGNED NOT NULL COMMENT 'Kelas tempat kuis dikerjakan',
  user_id      INT UNSIGNED NOT NULL COMMENT 'Murid yang mengerjakan',
  node_id      VARCHAR(100) NOT NULL COMMENT 'ID node Skill Tree (ReactFlow)',
  node_label   VARCHAR(200) NOT NULL DEFAULT '' COMMENT 'Judul node saat dikerjakan',
  score        TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Nilai 0-100',
  total_questions TINYINT UNSIGNED NOT NULL DEFAULT 0,
  correct_answers TINYINT UNSIGNED NOT NULL DEFAULT 0,
  wrong_answers   TEXT         NULL COMMENT 'JSON array pertanyaan yang dijawab salah',
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_qa_attempt (ruangan_id, user_id, node_id),
  KEY idx_qa_ruangan (ruangan_id),
  KEY idx_qa_user (user_id),
  KEY idx_qa_node (node_id),
  CONSTRAINT fk_qa_ruangan FOREIGN KEY (ruangan_id)
    REFERENCES ruangan (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_qa_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Rekaman jawaban kuis murid per node Skill Tree';

-- ============================================================
-- DATA DEMO
--   Guru  : guru@example.com   / password123
--   Murid : murid@example.com  / password123
--   Admin : admin@example.com  / password123
--   Ruangan : TREE01 (Kelas Demo — Dasar Pemrograman C++)
-- ============================================================
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Budi Guru (Demo)', 'guru@example.com', '$2y$10$QJMZzHK9O3h2LWcYzUsjE.zLt1mpt6yQeEpDnZN7JtXLqTdCxbCju', 'teacher'),
  ('Andi Murid (Demo)', 'murid@example.com', '$2y$10$QJMZzHK9O3h2LWcYzUsjE.zLt1mpt6yQeEpDnZN7JtXLqTdCxbCju', 'student'),
  ('Admin OSCAR', 'admin@example.com', '$2y$10$QJMZzHK9O3h2LWcYzUsjE.zLt1mpt6yQeEpDnZN7JtXLqTdCxbCju', 'admin');

INSERT INTO ruangan (nama, kode_ruangan, user_id) VALUES
  ('Kelas Demo — Dasar Pemrograman C++', 'TREE01', 1);

INSERT INTO class_members (ruangan_id, user_id) VALUES (1, 2);

-- Silabus demo TIDAK di-INSERT di sini: isi build disimpan sebagai FILE
-- (storage/ruangan/1.json), bukan di DB. Pada instalasi baru frontend
-- menampilkan template sampai guru menyimpan silabus pertama kali.
-- (Lihat catatan tabel syllabus di atas.)

