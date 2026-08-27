<?php
// ============================================================
// backend/controller/logic/RateLimiter.php
// Rate limiter universal: membatasi percobaan per IP + context.
//
// Context & Limit:
//   - login   : maks 5 percobaan gagal dalam 15 menit per IP
//   - register: maks 3 percobaan dalam 1 jam per IP (anti spam akun)
//
// Melebihi batas → diblokir sementara (429 Too Many Requests).
// Data percobaan lama otomatis dibersihkan (garbage collection).
//
// Dipakai oleh: auth/login.php, auth/register.php
// Prasyarat   : auth/config.php sudah di-include (fungsi db() tersedia)
// ============================================================

declare(strict_types=1);

class RateLimiter
{
    /**
     * Limit per context.
     *   requests = max percobaan yang diizinkan dalam window
     *   window   = jendela waktu (detik)
     */
    private const LIMITS = [
        'login' => [
            'requests' => 5,
            'window'   => 900,     // 15 menit
        ],
        'register' => [
            'requests' => 3,
            'window'   => 3600,    // 1 jam
        ],
    ];

    private PDO $db;

    public function __construct(?PDO $pdo = null)
    {
        $this->db = $pdo ?? db();
    }

    /**
     * Cek apakah IP masih boleh melakukan aksi pada context tertentu.
     * IP loopback (127.0.0.1, ::1, localhost) selalu diizinkan (untuk dev).
     *
     * @param string $ip      IP address
     * @param string $context 'login' atau 'register'
     * @return array{allowed: bool, remaining: int, retry_after: int}
     */
    public function check(string $ip, string $context = 'login'): array
    {
        // Loopback exemption: localhost selalu boleh (untuk development)
        if (self::isLoopback($ip)) {
            return [
                'allowed'    => true,
                'remaining'  => 999999,
                'retry_after'=> 0,
            ];
        }

        $this->cleanup();

        $limit = $this->getLimit($context);
        $attempts = $this->countAttempts($ip, $context);

        if ($attempts >= $limit['requests']) {
            $retryAfter = $this->getRetryAfter($ip, $context);
            return [
                'allowed'    => false,
                'remaining'  => 0,
                'retry_after'=> $retryAfter,
            ];
        }

        return [
            'allowed'    => true,
            'remaining'  => $limit['requests'] - $attempts,
            'retry_after'=> 0,
        ];
    }

    /**
     * Catat percobaan gagal. Loopback tidak dicatat.
     *
     * @param string $ip      IP address
     * @param string $context 'login' atau 'register'
     */
    public function recordFailure(string $ip, string $context = 'login'): void
    {
        if (self::isLoopback($ip)) {
            return; // Loopback tidak dicatat
        }
        $stmt = $this->db->prepare(
            'INSERT INTO login_attempts (ip_address, context) VALUES (?, ?)'
        );
        $stmt->execute([$ip, $context]);
    }

    /**
     * Hapus semua percobaan untuk IP + context tertentu.
     * Dipanggil saat aksi BERHASIL → reset counter.
     */
    public function clear(string $ip, string $context = 'login'): void
    {
        $stmt = $this->db->prepare(
            'DELETE FROM login_attempts WHERE ip_address = ? AND context = ?'
        );
        $stmt->execute([$ip, $context]);
    }

    /**
     * Cek apakah IP adalah loopback (localhost).
     * Loopback dikecualikan dari rate limiting untuk development.
     */
    public static function isLoopback(string $ip): bool
    {
        // Normalisasi: hapus prefix IPv6-mapped IPv4
        if (str_starts_with($ip, '::ffff:')) {
            $ip = substr($ip, 7);
        }
        return in_array($ip, ['127.0.0.1', '::1', 'localhost'], true)
            || str_starts_with($ip, '127.');
    }

    /**
     * Dapatkan limit untuk context tertentu.
     */
    private function getLimit(string $context): array
    {
        return self::LIMITS[$context] ?? self::LIMITS['login'];
    }

    /**
     * Hitung jumlah percobaan dalam jendela waktu.
     */
    private function countAttempts(string $ip, string $context): int
    {
        $limit = $this->getLimit($context);
        $stmt = $this->db->prepare(
            'SELECT COUNT(*) FROM login_attempts
             WHERE ip_address = ? AND context = ?
               AND attempted_at > NOW() - INTERVAL ? SECOND'
        );
        $stmt->execute([$ip, $context, $limit['window']]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * Hitung detik tersisa sampai blokir dibuka.
     */
    private function getRetryAfter(string $ip, string $context): int
    {
        $limit = $this->getLimit($context);
        $stmt = $this->db->prepare(
            'SELECT MIN(attempted_at) FROM login_attempts
             WHERE ip_address = ? AND context = ?
               AND attempted_at > NOW() - INTERVAL ? SECOND'
        );
        $stmt->execute([$ip, $context, $limit['window']]);
        $oldest = $stmt->fetchColumn();

        if (!$oldest) {
            return 0;
        }

        $oldestTime = strtotime((string) $oldest);
        $expiresAt  = $oldestTime + $limit['window'];
        $remaining  = $expiresAt - time();

        return max(0, $remaining);
    }

    /**
     * Bersihkan data percobaan lama (> jendela waktu terpanjang) agar tabel tidak membengkak.
     */
    private function cleanup(): void
    {
        // Gunakan window terpanjang (register = 3600 detik)
        $maxWindow = max(array_column(self::LIMITS, 'window'));
        $this->db->exec(
            'DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '
            . $maxWindow . ' SECOND'
        );
    }
}
