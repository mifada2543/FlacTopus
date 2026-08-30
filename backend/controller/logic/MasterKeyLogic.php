<?php
// ============================================================
// backend/controller/logic/MasterKeyLogic.php
// Logika bisnis Master Key untuk registrasi guru.
//
// Fitur:
//   - Generate key baru (single-use)
//   - Validate key
//   - Mark as used
//   - List all keys (admin)
//   - Delete key (admin)
//
// Dipakai oleh: auth/register.php, backend/controller/api/admin.php
// Prasyarat   : auth/config.php sudah di-include (fungsi db() tersedia)
// ============================================================

declare(strict_types=1);

class MasterKeyLogic
{
    private PDO $db;

    public function __construct(?PDO $pdo = null)
    {
        $this->db = $pdo ?? db();
    }

    /**
     * Cek apakah tabel master_keys sudah ada (migration v7).
     */
    private function tableExists(): bool
    {
        $check = $this->db->query("SHOW TABLES LIKE 'master_keys'");
        return (bool) ($check && $check->fetch());
    }

    /**
     * Generate master key baru (single-use).
     *
     * @return array{success: bool, message: string, key?: string}
     */
    public function generate(array $admin, string $description = '', int $maxUses = 1, ?string $expiresAt = null): array
    {
        if (!$this->tableExists()) {
            return ['success' => false, 'message' => 'Tabel master_keys belum tersedia. Jalankan migration v7.'];
        }

        // Hanya admin yang bisa generate
        if (($admin['role'] ?? '') !== 'admin') {
            return ['success' => false, 'message' => 'Hanya admin yang bisa generate Master Key.'];
        }

        // Generate token unik 32 karakter hex
        $keyValue = bin2hex(random_bytes(16));

        $stmt = $this->db->prepare(
            'INSERT INTO master_keys (key_value, description, max_uses, expires_at, created_by) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $keyValue,
            $description !== '' ? $description : null,
            max(1, $maxUses),
            $expiresAt,
            (int) $admin['id'],
        ]);

        return [
            'success' => true,
            'message' => 'Master Key berhasil digenerate.',
            'key'     => $keyValue,
        ];
    }

    /**
     * Validate master key.
     *
     * @return array{valid: bool, message: string}
     */
    public function validate(string $keyValue): array
    {
        if (!$this->tableExists()) {
            return ['valid' => false, 'message' => 'Tabel master_keys belum tersedia. Jalankan migration v7.'];
        }

        $keyValue = trim($keyValue);

        if ($keyValue === '') {
            return ['valid' => false, 'message' => 'Master Key tidak boleh kosong.'];
        }

        $stmt = $this->db->prepare('SELECT * FROM master_keys WHERE key_value = ?');
        $stmt->execute([$keyValue]);
        $key = $stmt->fetch();

        if (!$key) {
            return ['valid' => false, 'message' => 'Master Key tidak valid.'];
        }

        // Cek apakah sudah dipakai
        if ((int) $key['used_count'] >= (int) $key['max_uses']) {
            return ['valid' => false, 'message' => 'Master Key sudah tidak berlaku (sudah digunakan).'];
        }

        // Cek apakah expired
        if ($key['expires_at'] !== null && strtotime($key['expires_at']) < time()) {
            return ['valid' => false, 'message' => 'Master Key sudah kedaluwarsa.'];
        }

        return ['valid' => true, 'message' => 'Master Key valid.'];
    }

    /**
     * Tandai master key sudah dipakai.
     *
     * @param string $keyValue  Token master key
     * @param int    $userId    User ID yang memakai
     */
    public function markUsed(string $keyValue, int $userId): void
    {
        if (!$this->tableExists()) {
            return;
        }

        $stmt = $this->db->prepare(
            'UPDATE master_keys SET used_count = used_count + 1, used_by = ?, used_at = NOW() WHERE key_value = ? AND used_count < max_uses'
        );
        $stmt->execute([$userId, $keyValue]);
    }

    /**
     * List semua master keys (untuk admin panel).
     *
     * @return array{success: bool, keys: array}
     */
    public function listAll(): array
    {
        if (!$this->tableExists()) {
            return ['success' => true, 'keys' => []];
        }

        $sql = "SELECT 
            mk.*,
            u.name AS created_by_name,
            u2.name AS used_by_name
        FROM master_keys mk
        LEFT JOIN users u ON u.id = mk.created_by
        LEFT JOIN users u2 ON u2.id = mk.used_by
        ORDER BY mk.created_at DESC";

        $stmt = $this->db->query($sql);
        $keys = $stmt->fetchAll();

        // Konversi ke format yang bersih
        $keys = array_map(fn($k) => [
            'id'            => (int) $k['id'],
            'key_value'     => $k['key_value'],
            'description'   => $k['description'] ?? '',
            'max_uses'      => (int) $k['max_uses'],
            'used_count'    => (int) $k['used_count'],
            'used_by'       => $k['used_by'] ? (int) $k['used_by'] : null,
            'used_by_name'  => $k['used_by_name'] ?? null,
            'used_at'       => $k['used_at'],
            'expires_at'    => $k['expires_at'],
            'created_by'    => (int) $k['created_by'],
            'created_by_name' => $k['created_by_name'] ?? '',
            'created_at'    => $k['created_at'],
        ], $keys);

        return ['success' => true, 'keys' => $keys];
    }

    /**
     * Hapus master key.
     *
     * @return array{success: bool, message: string}
     */
    public function delete(array $admin, int $keyId): array
    {
        if (!$this->tableExists()) {
            return ['success' => false, 'message' => 'Tabel master_keys belum tersedia.'];
        }

        if (($admin['role'] ?? '') !== 'admin') {
            return ['success' => false, 'message' => 'Hanya admin yang bisa menghapus Master Key.'];
        }

        $stmt = $this->db->prepare('SELECT id, key_value FROM master_keys WHERE id = ?');
        $stmt->execute([$keyId]);
        $key = $stmt->fetch();

        if (!$key) {
            return ['success' => false, 'message' => 'Master Key tidak ditemukan.'];
        }

        // Hanya boleh hapus key yang belum dipakai
        if ((int) $key['used_count'] > 0) {
            return ['success' => false, 'message' => 'Master Key yang sudah digunakan tidak bisa dihapus.'];
        }

        $this->db->prepare('DELETE FROM master_keys WHERE id = ?')->execute([$keyId]);

        return ['success' => true, 'message' => 'Master Key berhasil dihapus.'];
    }
}
