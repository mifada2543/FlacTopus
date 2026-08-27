<?php
// ============================================================
// backend/controller/logic/GarbageCollector.php
// Pembersihan data sampah/orphaned secara periodik.
//
// Data yang dibersihkan:
//   1. activity_log    — hapus record > RETENTION_HARI hari
//   2. login_attempts   — hapus record > 1 jam (sudah ada di RateLimiter,
//                         tapi GC sebagai backup)
//   3. users.last_session_id — clear untuk user yang status != active
//   4. storage/chat/    — hapus folder chat untuk user/room yang sudah
//                         tidak ada di DB
//   5. storage/ruangan/ — hapus file silabus untuk ruangan yang sudah
//                         dihapus dari DB
//   6. PHP session files — biarkan PHP gc_maxlifetime yang handle
//   7. .tmp files       — hapus file temporary (.tmp) yang lebih tua
//                         dari 1 jam (sisa write gagal)
//
// Dipakai oleh:
//   - auth/config.php (auto-run periodik, max 1x per jam)
//   - scripts/gc.php (manual trigger via CLI atau cron)
// ============================================================

declare(strict_types=1);

class GarbageCollector
{
    /** Hari penyimpanan activity_log (default: 90 hari) */
    private const RETENTION_HARI = 90;

    /** Interval minimum antara GC run (detik) — cegah double-run */
    private const MIN_INTERVAL = 3600; // 1 jam

    private PDO $db;
    private string $storageDir;
    private array $results = [];

    public function __construct(?PDO $pdo = null)
    {
        $this->db = $pdo ?? db();
        $this->storageDir = __DIR__ . '/../../../storage';
    }

    // ================================================================
    // Public API
    // ================================================================

    /**
     * Jalankan semua pembersihan. Return summary.
     *
     * @return array{ran: bool, summary: array, duration_ms: int}
     */
    public function run(): array
    {
        $start = microtime(true);

        // Cek apakah sudah pernah jalan dalam interval minimum
        if (!$this->shouldRun()) {
            return [
                'ran'      => false,
                'summary'  => ['skip' => 'Sudah dijalankan dalam 1 jam terakhir.'],
                'duration_ms' => 0,
            ];
        }

        $this->log('GC started');

        // 1. Bersihkan activity_log lama
        $this->cleanActivityLog();

        // 2. Bersihkan login_attempts orphaned (backup dari RateLimiter)
        $this->cleanLoginAttempts();

        // 3. Clear last_session_id untuk user inactive
        $this->cleanStaleSessionIds();

        // 4. Bersihkan chat history orphaned
        $this->cleanOrphanedChatFiles();

        // 5. Bersihkan silabus orphaned
        $this->cleanOrphanedSyllabusFiles();

        // 6. Bersihkan .tmp files lama
        $this->cleanTempFiles();

        // 7. Catat waktu terakhir GC berjalan
        $this->touchLastRun();

        $duration = (int) ((microtime(true) - $start) * 1000);
        $this->log("GC completed in {$duration}ms");

        return [
            'ran'         => true,
            'summary'     => $this->results,
            'duration_ms' => $duration,
        ];
    }

    // ================================================================
    // Cleaner Methods
    // ================================================================

    /**
     * 1. Hapus activity_log yang lebih tua dari RETENTION_HARI.
     */
    private function cleanActivityLog(): void
    {
        $stmt = $this->db->prepare(
            'DELETE FROM activity_log WHERE created_at < NOW() - INTERVAL ? DAY'
        );
        $stmt->execute([self::RETENTION_HARI]);
        $deleted = $stmt->rowCount();
        $this->results['activity_log'] = $deleted . " records deleted (>" . self::RETENTION_HARI . " days)";
    }

    /**
     * 2. Hapus login_attempts yang lebih tua dari 1 jam.
     *    (Backup dari RateLimiter::cleanup yang hanya jalan saat check())
     */
    private function cleanLoginAttempts(): void
    {
        $stmt = $this->db->prepare(
            'DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL 1 HOUR'
        );
        $stmt->execute();
        $deleted = $stmt->rowCount();
        $this->results['login_attempts'] = $deleted . ' records deleted (> 1 hour old)';
    }

    /**
     * 3. Clear last_session_id untuk user yang bukan active.
     *    User pending/rejected tidak perlu menyimpan session ID.
     */
    private function cleanStaleSessionIds(): void
    {
        $stmt = $this->db->prepare(
            "UPDATE users SET last_session_id = NULL WHERE last_session_id IS NOT NULL AND status != 'active'"
        );
        $stmt->execute();
        $cleared = $stmt->rowCount();
        $this->results['stale_session_ids'] = $cleared . ' users cleared';
    }

    /**
     * 4. Hapus folder chat untuk user/room yang sudah tidak ada di DB.
     *    Struktur: storage/chat/[nama_user]/[kode_ruangan]/chat.json
     */
    private function cleanOrphanedChatFiles(): void
    {
        $chatDir = $this->storageDir . '/chat';
        if (!is_dir($chatDir)) {
            $this->results['orphaned_chats'] = '0 (no chat dir)';
            return;
        }

        $deleted = 0;
        $userDirs = array_filter(glob($chatDir . '/*'), 'is_dir');

        foreach ($userDirs as $userDir) {
            $roomDirs = array_filter(glob($userDir . '/*'), 'is_dir');

            foreach ($roomDirs as $roomDir) {
                $chatFile = $roomDir . '/chat.json';
                if (!is_file($chatFile)) continue;

                // Baca metadata dari JSON
                $data = json_decode((string) file_get_contents($chatFile), true);
                if (!is_array($data)) {
                    // File corrupt → hapus
                    $this->removeDir($roomDir);
                    $deleted++;
                    continue;
                }

                $userId   = (int) ($data['user_id'] ?? 0);
                $roomId   = (int) ($data['ruangan_id'] ?? 0);
                $roomCode = $data['room_code'] ?? '';

                // Cek user masih ada
                $stmt = $this->db->prepare('SELECT id FROM users WHERE id = ?');
                $stmt->execute([$userId]);
                if (!$stmt->fetch()) {
                    $this->removeDir($roomDir);
                    $deleted++;
                    continue;
                }

                // Cek room masih ada
                $stmt = $this->db->prepare('SELECT id FROM ruangan WHERE id = ?');
                $stmt->execute([$roomId]);
                if (!$stmt->fetch()) {
                    $this->removeDir($roomDir);
                    $deleted++;
                    continue;
                }
            }

            // Hapus folder user jika sudah kosong
            $this->removeDirIfEmpty($userDir);
        }

        $this->results['orphaned_chats'] = $deleted . " room folders deleted";
    }

    /**
     * 5. Hapus file silabus untuk ruangan yang sudah dihapus dari DB.
     *    File: storage/ruangan/<id>.json
     */
    private function cleanOrphanedSyllabusFiles(): void
    {
        $syllabusDir = $this->storageDir . '/ruangan';
        if (!is_dir($syllabusDir)) {
            $this->results['orphaned_syllabus'] = '0 (no syllabus dir)';
            return;
        }

        $files = glob($syllabusDir . '/*.json');
        $deleted = 0;

        foreach ($files as $file) {
            // Ekstrak ID dari nama file
            $basename = basename($file, '.json');
            $roomId = (int) $basename;

            if ($roomId <= 0) {
                // File dengan nama aneh → hapus
                @unlink($file);
                $deleted++;
                continue;
            }

            // Cek apakah ruangan masih ada
            $stmt = $this->db->prepare('SELECT id FROM ruangan WHERE id = ?');
            $stmt->execute([$roomId]);
            if (!$stmt->fetch()) {
                @unlink($file);
                $deleted++;
            }
        }

        $this->results['orphaned_syllabus'] = $deleted . " files deleted";
    }

    /**
     * 6. Hapus .tmp files yang lebih tua dari 1 jam.
     *    (Sisa write gagal dari saveSyllabus/save_chat)
     */
    private function cleanTempFiles(): void
    {
        $deleted = 0;
        $dirs = [
            $this->storageDir . '/ruangan',
            $this->storageDir . '/chat',
        ];

        foreach ($dirs as $dir) {
            if (!is_dir($dir)) continue;
            $tmpFiles = glob($dir . '/*.tmp', GLOB_NOSORT) ?: [];
            foreach ($tmpFiles as $tmp) {
                if (is_file($tmp) && (time() - filemtime($tmp)) > 3600) {
                    @unlink($tmp);
                    $deleted++;
                }
            }
        }

        $this->results['temp_files'] = $deleted . " .tmp files cleaned";
    }

    // ================================================================
    // Helpers
    // ================================================================

    /**
     * Cek apakah GC perlu dijalankan (interval minimum 1 jam).
     */
    private function shouldRun(): bool
    {
        $lastRunFile = $this->storageDir . '/.gc_last_run';
        if (!is_file($lastRunFile)) return true;

        $lastRun = (int) file_get_contents($lastRunFile);
        return (time() - $lastRun) >= self::MIN_INTERVAL;
    }

    /**
     * Catat waktu terakhir GC berjalan.
     */
    private function touchLastRun(): void
    {
        $lastRunFile = $this->storageDir . '/.gc_last_run';
        file_put_contents($lastRunFile, (string) time());
    }

    /**
     * Rekursively hapus folder beserta isinya.
     */
    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) return;
        $files = array_diff(scandir($dir), ['.', '..']);
        foreach ($files as $file) {
            $path = $dir . '/' . $file;
            is_dir($path) ? $this->removeDir($path) : @unlink($path);
        }
        @rmdir($dir);
    }

    /**
     * Hapus folder jika kosong (tidak ada file/subfolder).
     */
    private function removeDirIfEmpty(string $dir): void
    {
        if (!is_dir($dir)) return;
        $items = array_diff(scandir($dir), ['.', '..']);
        if (empty($items)) {
            @rmdir($dir);
        }
    }

    /**
     * Log sederhana (bisa diganti ke ActivityLogger nanti).
     */
    private function log(string $msg): void
    {
        $logFile = $this->storageDir . '/gc.log';
        $line = date('[Y-m-d H:i:s] ') . $msg . PHP_EOL;
        file_put_contents($logFile, $line, FILE_APPEND | LOCK_EX);
    }
}
