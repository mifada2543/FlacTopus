<?php
// ============================================================
// db/migration.php — Database Migration (CLI ONLY)
// ============================================================
// Jalankan dari terminal:
//   php db/migration.php
//
// Fitur:
//   - PENGGANTI FILE schema.sql JADUL. Semua pembuatan tabel & struktur ada di sini.
//   - Hanya bisa dijalankan dari PHP CLI (bukan browser)
//   - Version-based: lacak versi schema di tabel schema_version
//   - Idempotent: bisa dijalankan berulang kali tanpa error
//   - Tidak menghapus data yang ada
//   - Aman dijalankan di production
// ============================================================

declare(strict_types=1);

// === CLI GUARD ===
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    echo "ERROR: Script ini hanya bisa dijalankan dari PHP CLI.\n";
    echo "Jalankan: php db/migration.php\n";
    exit(1);
}

// === Koneksi DB ===
$dbHost = 'localhost';
$dbPort = 3306;
$dbName = 'project_lomba';
$dbUser = 'root';
$dbPass = '';

echo "╔══════════════════════════════════════════════════╗\n";
echo "║  Project Lomba — Database Migration             ║\n";
echo "╚══════════════════════════════════════════════════╝\n\n";

try {
    $pdo = new PDO(
        "mysql:host={$dbHost};port={$dbPort};charset=utf8mb4",
        $dbUser, $dbPass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]
    );

    // $dbName adalah konstanta hardcoded, tapi kita sanitasi untuk defense-in-depth
    $safeDbName = preg_replace('/[^a-zA-Z0-9_]/', '', $dbName);
    $pdo->exec("CREATE DATABASE IF NOT EXISTS {$safeDbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE {$safeDbName}");
    $pdo->exec("SET time_zone = '+07:00'");
    echo "✅ Koneksi ke database '{$dbName}' berhasil.\n\n";

    // Tabel pelacakan versi
    $pdo->exec("CREATE TABLE IF NOT EXISTS schema_version (
        version INT UNSIGNED NOT NULL, description VARCHAR(255) NOT NULL DEFAULT '',
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (version)
    ) ENGINE=InnoDB");

    $currentVersion = (int) $pdo->query("SELECT COALESCE(MAX(version), 0) FROM schema_version")->fetchColumn();
    echo "📌 Versi database saat ini: v{$currentVersion}\n\n";

    // === Helper: sanitasi identifier (alphanumeric + underscore) ===
    function sanitizeId(string $id): string {
        return preg_replace('/[^a-zA-Z0-9_]/', '', $id);
    }

    // === Helper: cek tabel ada ===
    function tableExists(PDO $db, string $name): bool {
        $name = sanitizeId($name); // defense-in-depth
        return (bool) $db->query("SHOW TABLES LIKE '{$name}'")->fetch();
    }

    // === Helper: cek kolom ada ===
    function columnExists(PDO $db, string $table, string $col): bool {
        $table = sanitizeId($table);
        $col = sanitizeId($col);
        $cols = $db->query("SHOW COLUMNS FROM `{$table}` LIKE '{$col}'")->fetch();
        return (bool) $cols;
    }

    // === Helper: cek index ada ===
    function indexExists(PDO $db, string $table, string $key): bool {
        $table = sanitizeId($table);
        $key = sanitizeId($key);
        $idx = $db->query("SHOW INDEX FROM `{$table}` WHERE Key_name = '{$key}'")->fetch();
        return (bool) $idx;
    }

    // === MIGRASI ===
    $applied = 0;

    // ── v1: Schema awal ──
    if ($currentVersion < 1) {
        echo "🔄 v1: Schema awal (users, ruangan, class_members, syllabus)... ";
        try {

            if (!tableExists($pdo, 'users')) {
                $pdo->exec("CREATE TABLE users (
                    id INT UNSIGNED NOT NULL AUTO_INCREMENT, name VARCHAR(100) NOT NULL,
                    email VARCHAR(150) NOT NULL, password_hash VARCHAR(255) NOT NULL,
                    role ENUM('student','teacher','admin') NOT NULL DEFAULT 'student',
                    status ENUM('pending','active','rejected') NOT NULL DEFAULT 'pending',
                    last_session_id VARCHAR(128) NULL DEFAULT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id), UNIQUE KEY uq_users_email (email)
                ) ENGINE=InnoDB");
            }

            if (!tableExists($pdo, 'ruangan')) {
                $pdo->exec("CREATE TABLE ruangan (
                    id INT UNSIGNED NOT NULL AUTO_INCREMENT, nama VARCHAR(150) NOT NULL,
                    kode_ruangan CHAR(6) NOT NULL, user_id INT UNSIGNED NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    last_active_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id), UNIQUE KEY uq_ruangan_kode (kode_ruangan),
                    KEY idx_ruangan_guru (user_id),
                    CONSTRAINT fk_ruangan_guru FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
                ) ENGINE=InnoDB");
            }

            if (!tableExists($pdo, 'class_members')) {
                $pdo->exec("CREATE TABLE class_members (
                    id INT UNSIGNED NOT NULL AUTO_INCREMENT, ruangan_id INT UNSIGNED NOT NULL,
                    user_id INT UNSIGNED NOT NULL, joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    last_seen_at TIMESTAMP NULL DEFAULT NULL,
                    PRIMARY KEY (id), UNIQUE KEY uq_class_member (ruangan_id, user_id),
                    KEY idx_members_user (user_id),
                    CONSTRAINT fk_members_ruangan FOREIGN KEY (ruangan_id) REFERENCES ruangan (id) ON DELETE CASCADE ON UPDATE CASCADE,
                    CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
                ) ENGINE=InnoDB");
            }

            if (!tableExists($pdo, 'syllabus')) {
                $pdo->exec("CREATE TABLE syllabus (
                    id INT UNSIGNED NOT NULL AUTO_INCREMENT, ruangan_id INT UNSIGNED NOT NULL,
                    file_path VARCHAR(255) NOT NULL,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id), UNIQUE KEY uq_syllabus_ruangan (ruangan_id),
                    CONSTRAINT fk_syllabus_ruangan FOREIGN KEY (ruangan_id) REFERENCES ruangan (id) ON DELETE CASCADE ON UPDATE CASCADE
                ) ENGINE=InnoDB");
            }

            // Data demo (hanya jika users kosong)
            $userCount = (int) $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
            if ($userCount === 0) {
                $hash = password_hash('password123', PASSWORD_BCRYPT);
                $pdo->exec("INSERT INTO users (name, email, password_hash, role, status) VALUES
                    ('Budi Guru (Demo)', 'guru@example.com', '{$hash}', 'teacher', 'active'),
                    ('Andi Murid (Demo)', 'murid@example.com', '{$hash}', 'student', 'active'),
                    ('Admin OSCAR', 'admin@example.com', '{$hash}', 'admin', 'active')");
                $pdo->exec("INSERT INTO ruangan (nama, kode_ruangan, user_id) VALUES ('Kelas Demo — Dasar Pemrograman C++', 'TREE01', 1)");
                $pdo->exec("INSERT INTO class_members (ruangan_id, user_id) VALUES (1, 2)");
            }

            $pdo->exec("INSERT IGNORE INTO schema_version (version, description) VALUES (1, 'Schema awal')");
            echo "✅\n";
            $applied++;
        } catch (PDOException $e) { echo "❌ {$e->getMessage()}\n"; exit(1); }
    }

    // ── v2: login_attempts (rate limiting) ──
    if ($currentVersion < 2) {
        echo "🔄 v2: Tambah tabel login_attempts (rate limiting)... ";
        try {
            if (!tableExists($pdo, 'login_attempts')) {
                $pdo->exec("CREATE TABLE login_attempts (
                    id INT UNSIGNED NOT NULL AUTO_INCREMENT, ip_address VARCHAR(45) NOT NULL,
                    context VARCHAR(20) NOT NULL DEFAULT 'login',
                    attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id), KEY idx_attempts_ip_ctx_time (ip_address, context, attempted_at)
                ) ENGINE=InnoDB");
            }
            $pdo->exec("INSERT IGNORE INTO schema_version (version, description) VALUES (2, 'Tambah login_attempts')");
            echo "✅\n";
            $applied++;
        } catch (PDOException $e) { echo "❌ {$e->getMessage()}\n"; exit(1); }
    }

    // ── v3: activity_log (audit trail) ──
    if ($currentVersion < 3) {
        echo "🔄 v3: Tambah tabel activity_log (audit trail)... ";
        try {
            if (!tableExists($pdo, 'activity_log')) {
                $pdo->exec("CREATE TABLE activity_log (
                    id INT UNSIGNED NOT NULL AUTO_INCREMENT, user_id INT UNSIGNED NULL DEFAULT NULL,
                    action VARCHAR(100) NOT NULL, ip_address VARCHAR(45) NOT NULL DEFAULT '0.0.0.0',
                    user_agent VARCHAR(255) NOT NULL DEFAULT '',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id), KEY idx_log_user (user_id), KEY idx_log_time (created_at),
                    KEY idx_log_action (action)
                ) ENGINE=InnoDB");
            }
            $pdo->exec("INSERT IGNORE INTO schema_version (version, description) VALUES (3, 'Tambah activity_log')");
            echo "✅\n";
            $applied++;
        } catch (PDOException $e) { echo "❌ {$e->getMessage()}\n"; exit(1); }
    }

    // ── v4: Tambah kolom theme_color (ruangan) & role/is_marked/pinned_at (class_members) ──
    if ($currentVersion < 4) {
        echo "🔄 v4: Tambah kolom theme_color & role, is_marked, pinned_at... ";
        try {
            // ruangan: tambah theme_color
            if (tableExists($pdo, 'ruangan') && !columnExists($pdo, 'ruangan', 'theme_color')) {
                $pdo->exec("ALTER TABLE ruangan ADD COLUMN theme_color VARCHAR(50) NOT NULL DEFAULT '#0f172a' AFTER user_id");
            }

            // class_members: tambah role, is_marked, pinned_at
            if (tableExists($pdo, 'class_members')) {
                if (!columnExists($pdo, 'class_members', 'role')) {
                    $pdo->exec("ALTER TABLE class_members ADD COLUMN role ENUM('member','admin') NOT NULL DEFAULT 'member' AFTER last_seen_at");
                }
                if (!columnExists($pdo, 'class_members', 'is_marked')) {
                    $pdo->exec("ALTER TABLE class_members ADD COLUMN is_marked TINYINT(1) NOT NULL DEFAULT 0 AFTER role");
                }
                if (!columnExists($pdo, 'class_members', 'pinned_at')) {
                    $pdo->exec("ALTER TABLE class_members ADD COLUMN pinned_at TIMESTAMP NULL DEFAULT NULL AFTER is_marked");
                }
            }

            $pdo->exec("INSERT IGNORE INTO schema_version (version, description) VALUES (4, 'Tambah kolom theme_color, role, is_marked, pinned_at')");
            echo "✅\n";
            $applied++;
        } catch (PDOException $e) { echo "❌ {$e->getMessage()}\n"; exit(1); }
    }

    // ── v5: Tabel quiz_attempts (rekam jawaban murid) ──
    if ($currentVersion < 5) {
        echo "🔄 v5: Tambah tabel quiz_attempts (rekam jawaban murid)... ";
        try {
            if (!tableExists($pdo, 'quiz_attempts')) {
                $pdo->exec("CREATE TABLE quiz_attempts (
                    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                    ruangan_id INT UNSIGNED NOT NULL,
                    user_id INT UNSIGNED NOT NULL,
                    node_id VARCHAR(100) NOT NULL,
                    node_label VARCHAR(255) NOT NULL DEFAULT '',
                    score INT NOT NULL DEFAULT 0,
                    total_questions INT NOT NULL DEFAULT 0,
                    correct_answers INT NOT NULL DEFAULT 0,
                    wrong_answers JSON NULL DEFAULT NULL,
                    tab_switches INT NOT NULL DEFAULT 0,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    KEY idx_qa_ruangan (ruangan_id),
                    KEY idx_qa_user (user_id),
                    KEY idx_qa_node (node_id),
                    CONSTRAINT fk_qa_ruangan FOREIGN KEY (ruangan_id) REFERENCES ruangan (id) ON DELETE CASCADE ON UPDATE CASCADE,
                    CONSTRAINT fk_qa_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
                ) ENGINE=InnoDB");
            }
            $pdo->exec("INSERT IGNORE INTO schema_version (version, description) VALUES (5, 'Tambah tabel quiz_attempts')");
            echo "✅\n";
            $applied++;
        } catch (PDOException $e) { echo "❌ {$e->getMessage()}\n"; exit(1); }
    }

    // ── v6: Tambah kolom deleted_at & deleted_by ke ruangan (soft delete) ──
    if ($currentVersion < 6) {
        echo "🔄 v6: Tambah kolom deleted_at, deleted_by ke ruangan (soft delete)... ";
        try {
            if (tableExists($pdo, 'ruangan')) {
                if (!columnExists($pdo, 'ruangan', 'deleted_at')) {
                    $pdo->exec("ALTER TABLE ruangan ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER last_active_at");
                }
                if (!columnExists($pdo, 'ruangan', 'deleted_by')) {
                    $pdo->exec("ALTER TABLE ruangan ADD COLUMN deleted_by INT UNSIGNED NULL DEFAULT NULL AFTER deleted_at");
                }
            }
            $pdo->exec("INSERT IGNORE INTO schema_version (version, description) VALUES (6, 'Tambah kolom deleted_at, deleted_by ke ruangan')");
            echo "✅\n";
            $applied++;
        } catch (PDOException $e) { echo "❌ {$e->getMessage()}\n"; exit(1); }
    }

    // ── v7: Tabel master_keys (untuk registrasi guru via token) ──
    if ($currentVersion < 7) {
        echo "🔄 v7: Tambah tabel master_keys (registrasi guru)... ";
        try {
            if (!tableExists($pdo, 'master_keys')) {
                $pdo->exec("CREATE TABLE master_keys (
                    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                    key_value VARCHAR(64) NOT NULL COMMENT 'Token unik (single-use)',
                    description VARCHAR(255) DEFAULT NULL COMMENT 'Keterangan (mis: Guru TKJ 2024)',
                    max_uses INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Max penggunaan (selalu 1)',
                    used_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Sudah dipakai berapa kali',
                    used_by INT UNSIGNED NULL DEFAULT NULL COMMENT 'User ID yang pakai',
                    used_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Kapan dipakai',
                    expires_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Kapan expired (NULL = tidak expired)',
                    created_by INT UNSIGNED NOT NULL COMMENT 'Admin yang generate',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    UNIQUE KEY uq_master_key (key_value),
                    KEY idx_mk_created_by (created_by),
                    CONSTRAINT fk_mk_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
                ) ENGINE=InnoDB");
            }
            $pdo->exec("INSERT IGNORE INTO schema_version (version, description) VALUES (7, 'Tambah tabel master_keys')");
            echo "✅\n";
            $applied++;
        } catch (PDOException $e) { echo "❌ {$e->getMessage()}\n"; exit(1); }
    }

    // ── v8: Tabel app_settings (konfigurasi aplikasi seperti auto-approve) ──
    if ($currentVersion < 8) {
        echo "🔄 v8: Tambah tabel app_settings (konfigurasi aplikasi)... ";
        try {
            if (!tableExists($pdo, 'app_settings')) {
                $pdo->exec("CREATE TABLE app_settings (
                    setting_key VARCHAR(50) NOT NULL,
                    setting_value VARCHAR(255) NOT NULL DEFAULT '',
                    description VARCHAR(255) DEFAULT NULL,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (setting_key)
                ) ENGINE=InnoDB");

                // Default settings
                $pdo->exec("INSERT INTO app_settings (setting_key, setting_value, description) VALUES
                    ('student_auto_approve', '0', 'Jika 1, murid langsung aktif tanpa approve admin'),
                    ('maintenance_mode', '0', 'Jika 1, site dalam mode maintenance')");
            }
            $pdo->exec("INSERT IGNORE INTO schema_version (version, description) VALUES (8, 'Tambah tabel app_settings')");
            echo "✅\n";
            $applied++;
        } catch (PDOException $e) { echo "❌ {$e->getMessage()}\n"; exit(1); }
    }

    // Ringkasan
    $newVersion = (int) $pdo->query("SELECT MAX(version) FROM schema_version")->fetchColumn();
    echo "\n";
    if ($applied > 0) {
        echo "🎉 {$applied} migrasi berhasil diterapkan!\n";
    } else {
        echo "✅ Database sudah versi terbaru (v{$currentVersion}).\n";
    }
    echo "\n📊 Versi: v{$currentVersion} → v{$newVersion} | Diterapkan: {$applied}\n";

    echo "\n📋 Tabel:\n";
    foreach ($pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN) as $t) {
        $c = $pdo->query("SELECT COUNT(*) FROM `{$t}`")->fetchColumn();
        echo "   - {$t} ({$c} baris)\n";
    }
    echo "\n✅ Selesai!\n";

} catch (PDOException $e) {
    echo "\n❌ ERROR: {$e->getMessage()}\n";
    exit(1);
}
