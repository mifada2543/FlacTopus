-- ============================================================
-- db/migrate_quiz_attempts.sql
-- Migrasi: Tambah tabel quiz_attempts ke database yang sudah ada
-- ============================================================
-- Jalankan via phpMyAdmin (Import) atau terminal:
--   mysql -u root project_lomba < db/migrate_quiz_attempts.sql
-- ============================================================

USE project_lomba;

CREATE TABLE IF NOT EXISTS quiz_attempts (
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
  KEY idx_qa_ruangan (ruangan_id),
  KEY idx_qa_user (user_id),
  KEY idx_qa_node (node_id),
  CONSTRAINT fk_qa_ruangan FOREIGN KEY (ruangan_id)
    REFERENCES ruangan (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_qa_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Rekaman jawaban kuis murid per node Skill Tree';
