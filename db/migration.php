<?php
// ============================================================
// db/migration.php — Database Migration (CLI ONLY)
// ============================================================
// Jalankan dari terminal:
//   php db/migration.php
//
// Fitur:
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

    $pdo->exec("CREATE DATABASE IF NOT EXISTS {$dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE {$dbName}");
    $pdo->exec("SET time_zone = '+07:00'");
    echo "✅ Koneksi ke database '{$dbName}' berhasil.\n\n";

    // Tabel pelacakan versi
    $pdo->exec("CREATE TABLE IF NOT EXISTS schema_version (
        version INT UNSIGNED NOT NULL, description VARCHAR(255) NOT NULL DEFAULT '',
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (version)
    ) ENGINE=InnoDB");

    $currentVersion = (int) $pdo->query("SELECT COALESCE(MAX(version), 0) FROM schema_version")->fetchColumn();
    echo "📌 Versi database saat ini: v{$currentVersion}\n\n";

    // === Helper: cek tabel ada ===
    function tableExists(PDO $db, string $name): bool {
        return (bool) $db->query("SHOW TABLES LIKE '{$name}'")->fetch();
    }

    // === Helper: cek kolom ada ===
    function columnExists(PDO $db, string $table, string $col): bool {
        $cols = $db->query("SHOW COLUMNS FROM `{$table}` LIKE '{$col}'")->fetch();
        return (bool) $cols;
    }

    // === Helper: cek index ada ===
    function indexExists(PDO $db, string $table, string $key): bool {
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
