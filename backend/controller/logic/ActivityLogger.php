<?php
// ============================================================
// backend/controller/logic/ActivityLogger.php
// Audit trail — mencatat semua aktivitas pengguna ke database.
//
// Dipakai oleh: auth/login.php, auth/logout.php, backend/controller/api/admin.php
// Prasyarat   : auth/config.php sudah di-include (fungsi db() tersedia)
//
// Contoh aksi yang dicatat:
//   login, logout, register, login_failed, rate_limited,
//   approve, reject, change_role, delete_user, reset_password,
//   create_room, delete_room, restore_room, force_delete_room, kick_member
// ============================================================

declare(strict_types=1);

class ActivityLogger
{
    private PDO $db;

    public function __construct(?PDO $pdo = null)
    {
        $this->db = $pdo ?? db();
    }

    /**
     * Catat aktivitas ke tabel activity_log.
     *
     * @param int|null $userId  ID user (null untuk guest/tidak terautentikasi)
     * @param string   $action  Tipe aksi (login, logout, approve, dll)
     */
    public function log(?int $userId, string $action): void
    {
        $ip       = $this->getClientIp();
        $userAgent = $this->getUserAgent();

        $stmt = $this->db->prepare(
            'INSERT INTO activity_log (user_id, action, ip_address, user_agent)
             VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$userId, $action, $ip, $userAgent]);
    }

    /**
     * Ambil daftar aktivitas (untuk admin panel / audit log viewer).
     *
     * @param array{search?: string, action?: string, user_id?: int, limit?: int, offset?: int} $filters
     * @return array{logs: array, total: int}
     */
    public function getLogs(array $filters = []): array
    {
        $where  = [];
        $params = [];

        if (!empty($filters['search'])) {
            $where[] = '(al.action LIKE ? OR u.name LIKE ? OR al.ip_address LIKE ?)';
            $term = "%{$filters['search']}%";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }
        if (!empty($filters['action'])) {
            $where[] = 'al.action = ?';
            $params[] = $filters['action'];
        }
        if (!empty($filters['user_id'])) {
            $where[] = 'al.user_id = ?';
            $params[] = (int) $filters['user_id'];
        }

        $whereSql = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        // Count total
        $countSql = "SELECT COUNT(*) FROM activity_log al LEFT JOIN users u ON u.id = al.user_id {$whereSql}";
        $stmt = $this->db->prepare($countSql);
        $stmt->execute($params);
        $total = (int) $stmt->fetchColumn();

        // Fetch page
        // PDO MySQL tidak mendukung parameterized LIMIT/OFFSET,
        // jadi kita cast ke (int) untuk mencegah SQL injection.
        $limit  = min(100, max(1, (int) ($filters['limit'] ?? 50)));
        $offset = max(0, (int) ($filters['offset'] ?? 0));

        $sql = "SELECT al.id, al.user_id, COALESCE(u.name, 'System') AS user_name,
                       al.action, al.ip_address, al.user_agent, al.created_at
                FROM activity_log al
                LEFT JOIN users u ON u.id = al.user_id
                {$whereSql}
                ORDER BY al.created_at DESC
                LIMIT {$limit} OFFSET {$offset}";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $logs = $stmt->fetchAll();

        return ['logs' => $logs, 'total' => $total];
    }

    /**
     * Ambil statistik ringkas aktivitas.
     */
    public function getStats(): array
    {
        $stmt = $this->db->query(
            "SELECT
                COUNT(*) AS total,
                SUM(action = 'login') AS total_login,
                SUM(action = 'login_failed') AS total_login_failed,
                SUM(action = 'rate_limited') AS total_rate_limited,
                SUM(action = 'logout') AS total_logout,
                SUM(action IN ('approve_user','reject_user','change_role','delete_user','reset_password')) AS total_admin_actions
             FROM activity_log"
        );
        $row = $stmt->fetch();
        if (!$row) return [];
        return array_map(fn($v) => (int) $v, $row);
    }

    /**
     * Dapatkan IP client yang valid (handle proxy).
     */
    private function getClientIp(): string
    {
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $ip = trim(explode(',', $ip)[0]);
        if (filter_var($ip, FILTER_VALIDATE_IP)) {
            return $ip;
        }
        return '0.0.0.0';
    }

    /**
     * Dapatkan user agent (dipotong agar tidak terlalu panjang di DB).
     */
    private function getUserAgent(): string
    {
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
        // Strip HTML tags & potong agar aman dari stored XSS
        $ua = strip_tags($ua);
        return mb_substr($ua, 0, 255);
    }
}
