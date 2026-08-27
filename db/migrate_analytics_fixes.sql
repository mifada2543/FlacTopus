-- ============================================================
-- db/migrate_analytics_fixes.sql
-- Migrasi: Fix anti-spam kuis, tambah ketua kelas, dan tema kelas
-- ============================================================

USE project_lomba;

-- 1. Tambah theme_color di tabel ruangan (jika belum ada)
-- Format warna HEX, default warna gelap bawaan
ALTER TABLE ruangan 
ADD COLUMN IF NOT EXISTS theme_color VARCHAR(20) NOT NULL DEFAULT '#0f172a' AFTER kode_ruangan;

-- 2. Tambah role admin/ketua kelas di class_members (jika belum ada)
ALTER TABLE class_members
ADD COLUMN IF NOT EXISTS role ENUM('member', 'admin') NOT NULL DEFAULT 'member' AFTER user_id;

-- 3. Hapus data duplikat di quiz_attempts agar kita bisa membuat UNIQUE KEY
-- Menyimpan hanya attempt pertama (created_at paling awal) per (ruangan_id, user_id, node_id)
DELETE t1 FROM quiz_attempts t1
INNER JOIN quiz_attempts t2 
WHERE 
    t1.ruangan_id = t2.ruangan_id AND
    t1.user_id = t2.user_id AND
    t1.node_id = t2.node_id AND
    t1.id > t2.id;

-- 4. Tambahkan UNIQUE KEY untuk mencegah spam
ALTER TABLE quiz_attempts
ADD UNIQUE KEY IF NOT EXISTS uq_qa_attempt (ruangan_id, user_id, node_id);
