<?php
// ============================================================
// scripts/gc.php — Garbage Collector CLI
// ============================================================
// Jalankan dari terminal:
//   php scripts/gc.php
//
// Atau via cron (setiap jam):
//   0 * * * * cd /opt/lampp/htdocs/FlacTopus && php scripts/gc.php >> storage/gc.log 2>&1
//
// Fitur:
//   - Bersihkan activity_log lama (> 90 hari)
//   - Bersihkan login_attempts orphaned (> 1 jam)
//   - Clear last_session_id untuk user inactive
//   - Hapus chat history orphaned (user/room sudah dihapus)
//   - Hapus silabus orphaned (room sudah dihapus)
//   - Hapus .tmp files lama (> 1 jam)
//   - Anti double-run (interval minimum 1 jam)
// ============================================================

declare(strict_types=1);

// Timezone: UTC+7 (WIB) untuk log PHP date()
date_default_timezone_set('Asia/Jakarta');

// === CLI GUARD ===
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    echo "ERROR: Script ini hanya bisa dijalankan dari PHP CLI.\n";
    echo "Jalankan: php scripts/gc.php\n";
    exit(1);
}

// === Koneksi DB ===
$dbHost = 'localhost';
$dbPort = 3306;
$dbName = 'project_lomba';
$dbUser = 'root';
$dbPass = '';

echo "╔══════════════════════════════════════════════════╗\n";
echo "║  FlacTopus — Garbage Collector                   ║\n";
echo "╚══════════════════════════════════════════════════╝\n\n";

try {
    $pdo = new PDO(
        "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4",
        $dbUser, $dbPass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]
    );

    // Timezone sesi MySQL = UTC+7 (WIB) — konsisten dengan auth/config.php
    $pdo->exec("SET time_zone = '+07:00'");

    echo "✅ Koneksi ke database '{$dbName}' berhasil.\n\n";

    require_once __DIR__ . '/../backend/controller/logic/GarbageCollector.php';

    $gc = new GarbageCollector($pdo);
    $result = $gc->run();

    if (!$result['ran']) {
        echo "⏭️  " . $result['summary']['skip'] . "\n";
        exit(0);
    }

    echo "📊 Hasil Garbage Collection:\n";
    echo str_repeat('─', 50) . "\n";
    foreach ($result['summary'] as $key => $value) {
        echo "  " . str_pad($key, 20) . " → " . $value . "\n";
    }
    echo str_repeat('─', 50) . "\n";
    echo "⏱️  Durasi: {$result['duration_ms']}ms\n\n";
    echo "✅ Selesai!\n";

} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
