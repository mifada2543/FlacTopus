<?php
// ============================================================
// backend/controller/logic/RuanganLogic.php
// Logika bisnis RUANGAN (kelas yang dibuat guru)
//
// Fitur:
//   - Ruangan otomatis TERHAPUS setelah 2 jam tanpa penggunaan
//     (last_active_at di-refresh oleh aktivitas siapa pun yang
//     membuka/bergabung ke ruangan — lazy cleanup saat list).
//   - Hanya guru PEMBUAT (atau admin) yang bisa menghapus.
//   - Murid bergabung via kode_ruangan 6 karakter (tabel
//     class_members dipakai ulang sebagai keanggotaan).
//
// Dipakai oleh: backend/controller/api/ruangan.php
// Prasyarat   : auth/config.php sudah di-include (fungsi db() tersedia)
// ============================================================

declare(strict_types=1);

class RuanganLogic
{
    /** Masa hidup ruangan tanpa aktivitas (detik) = 2 jam */
    public const TTL_DETIK = 7200;

    /** Jendela "masih ada orang" — online jika heartbeat < 5 menit lalu */
    public const PRESENSI_DETIK = 300;

    /**
     * Folder penyimpanan build silabus (nodes/edges) PER RUANGAN.
     * Isi JSON tidak lagi disimpan di kolom DB (agar DB tidak membawa
     * karakter panjang); DB hanya menyimpan pointer file_path.
     * Di luar web root → tidak bisa diakses langsung lewat browser
     * (folder ini ada di htdocs, tapi dilindungi storage/.htaccess).
     */
    public const STORAGE_DIR = __DIR__ . '/../../../storage/ruangan';

    private PDO $db;

    public function __construct(?PDO $pdo = null)
    {
        $this->db = $pdo ?? db();
    }

    /**
     * Hapus permanen ruangan yang sudah > 2 jam tanpa penggunaan.
     * (Hard delete — anggota & silabus ikut terhapus via FK CASCADE;
     * file build per ruangan di storage/ juga ikut dihapus.)
     *
     * @return int jumlah ruangan yang dihapus
     */
    public function purgeExpired(): int
    {
        // Fitur auto-delete 2 jam dimatikan atas instruksi.
        // Ruangan kini bersifat permanen.
        return 0;
    }

    /**
     * Daftar ruangan sesuai role pengguna:
     *   - admin   : SEMUA ruangan
     *   - teacher : ruangan yang dibuatnya
     *   - student : ruangan yang digabung
     */
    public function listForUser(array $user): array
    {
        $this->purgeExpired(); // lazy cleanup: bersihkan yang expired dulu

        $role = $user['role'] ?? 'student';
        $uid  = (int) $user['id'];

        // sisa_detik tidak lagi relevan karena ruangan permanen, tapi di-set 999999 untuk fallback.
        $sisa = '999999 AS sisa_detik';

        if ($role === 'admin') {
            // Admin web tidak memiliki akses ke kelas manapun
            return [];
        } elseif ($role === 'teacher') {
            $sql = "SELECT r.*, u.name AS guru, $sisa
                    FROM ruangan r JOIN users u ON u.id = r.user_id
                    WHERE r.user_id = ?
                    ORDER BY r.created_at DESC";
            $params = [$uid];
        } else {
            $sql = "SELECT r.*, u.name AS guru, $sisa, cm.role AS member_role
                    FROM ruangan r
                    JOIN users u ON u.id = r.user_id
                    JOIN class_members cm ON cm.ruangan_id = r.id
                    WHERE cm.user_id = ?
                    ORDER BY r.created_at DESC";
            $params = [$uid];
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // Jumlah anggota per ruangan (satu query untuk semua)
        $counts = [];
        $ids = array_map(static fn ($r) => (int) $r['id'], $rows);
        if ($ids) {
            $in   = implode(',', array_fill(0, count($ids), '?'));
            $c    = $this->db->prepare(
                "SELECT ruangan_id, COUNT(*) AS jml FROM class_members WHERE ruangan_id IN ($in) GROUP BY ruangan_id"
            );
            $c->execute($ids);
            foreach ($c->fetchAll() as $row) {
                $counts[(int) $row['ruangan_id']] = (int) $row['jml'];
            }
        }

        return array_map(static function ($r) use ($counts) {
            return [
                'id'            => (int) $r['id'],
                'nama'          => $r['nama'],
                'kode_ruangan'  => $r['kode_ruangan'],
                'user_id'       => (int) $r['user_id'],
                'guru'          => $r['guru'],
                'anggota'       => $counts[(int) $r['id']] ?? 0,
                'created_at'    => $r['created_at'],
                'last_active_at'=> $r['last_active_at'],
                'sisa_detik'    => (int) ($r['sisa_detik'] ?? 0),
                'theme_color'   => $r['theme_color'] ?? '#0f172a',
                'member_role'   => $r['member_role'] ?? 'owner',
            ];
        }, $rows);
    }

    /** Guru/admin membuat ruangan baru. */
    public function create(array $user, string $nama, string $themeColor = '#0f172a'): array
    {
        $nama = trim($nama);
        if (mb_strlen($nama) < 3) {
            return ['success' => false, 'message' => 'Nama ruangan minimal 3 karakter.'];
        }

        $kode = $this->generateKode();
        $stmt = $this->db->prepare('INSERT INTO ruangan (nama, kode_ruangan, user_id, theme_color) VALUES (?, ?, ?, ?)');
        $stmt->execute([$nama, $kode, (int) $user['id'], $themeColor]);

        return [
            'success' => true,
            'message' => 'Ruangan berhasil dibuat. Bagikan kode ruangan ke murid.',
            'ruangan' => [
                'id'            => (int) $this->db->lastInsertId(),
                'nama'          => $nama,
                'kode_ruangan'  => $kode,
                'user_id'       => (int) $user['id'],
                'guru'          => $user['name'],
                'anggota'       => 0,
                'sisa_detik'    => self::TTL_DETIK,
                'theme_color'   => $themeColor,
            ],
        ];
    }

    /** Murid bergabung ke ruangan via kode. */
    public function join(array $user, string $kode): array
    {
        $this->purgeExpired();

        $kode = strtoupper(trim($kode));
        if (strlen($kode) !== 6) {
            return ['success' => false, 'message' => 'Kode ruangan harus 6 karakter.'];
        }

        if ($user['role'] === 'admin') {
            return ['success' => false, 'message' => 'Admin tidak diizinkan masuk ke kelas guru.'];
        }

        $stmt = $this->db->prepare('SELECT * FROM ruangan WHERE kode_ruangan = ?');
        $stmt->execute([$kode]);
        $room = $stmt->fetch();

        if (!$room) {
            return ['success' => false, 'message' => 'Ruangan tidak ditemukan atau sudah kedaluwarsa. Periksa kembali kode ruangan.'];
        }
        if ((int) $room['user_id'] === (int) $user['id']) {
            return ['success' => false, 'message' => 'Anda adalah pembuat ruangan ini — tidak perlu bergabung.'];
        }

        $stmt = $this->db->prepare('SELECT id FROM class_members WHERE ruangan_id = ? AND user_id = ?');
        $stmt->execute([(int) $room['id'], (int) $user['id']]);
        $sudah = (bool) $stmt->fetch();

        if (!$sudah) {
            $stmt = $this->db->prepare('INSERT INTO class_members (ruangan_id, user_id) VALUES (?, ?)');
            $stmt->execute([(int) $room['id'], (int) $user['id']]);
        }

        $this->touch($user, (int) $room['id']); // bergabung = aktivitas → reset timer

        $stmt = $this->db->prepare('SELECT name FROM users WHERE id = ?');
        $stmt->execute([(int) $room['user_id']]);
        $guru = $stmt->fetchColumn() ?: '';

        $stmt = $this->db->prepare('SELECT COUNT(*) FROM class_members WHERE ruangan_id = ?');
        $stmt->execute([(int) $room['id']]);

        return [
            'success' => true,
            'message' => 'Berhasil bergabung ke ruangan!',
            'ruangan' => [
                'id'            => (int) $room['id'],
                'nama'          => $room['nama'],
                'kode_ruangan'  => $room['kode_ruangan'],
                'user_id'       => (int) $room['user_id'],
                'guru'          => $guru,
                'anggota'       => (int) $stmt->fetchColumn(),
                'sisa_detik'    => self::TTL_DETIK,
            ],
        ];
    }

    /**
     * Hapus ruangan — hanya guru pembuat atau admin.
     * (Hard delete; anggota & silabus terhapus via CASCADE.)
     */
    public function delete(array $user, int $id): array
    {
        $this->purgeExpired();

        if (!$this->isOwner($id, (int) $user['id'])) {
            return ['success' => false, 'message' => 'Hanya guru pembuat ruangan yang bisa menghapus.'];
        }

        $this->db->prepare('DELETE FROM ruangan WHERE id = ?')->execute([$id]);
        $this->deleteSyllabusFile($id); // hapus file build-nya juga
        return ['success' => true, 'message' => 'Ruangan dihapus.'];
    }

    /** Reset data analitik (quiz_attempts) untuk ruangan ini */
    public function resetAnalytics(array $user, int $id): array
    {
        if (!$this->isOwnerOrAdmin($id, (int) $user['id'])) {
            return ['success' => false, 'message' => 'Hanya guru yang bisa mereset analitik.'];
        }

        $stmt = $this->db->prepare('DELETE FROM quiz_attempts WHERE ruangan_id = ?');
        $stmt->execute([$id]);

        return ['success' => true, 'message' => 'Data analitik berhasil di-reset.'];
    }

    /**
     * Ubah nama ruangan dan tema warna. Hanya pemilik ruangan atau admin.
     * (Mengubah nama = aktivitas → keep-alive timer 2 jam.)
     */
    public function rename(array $user, int $id, string $nama, string $themeColor = '#0f172a'): array
    {
        $this->purgeExpired();

        $nama = trim($nama);
        if (mb_strlen($nama) < 3) {
            return ['success' => false, 'message' => 'Nama ruangan minimal 3 karakter.'];
        }

        if (!$this->isOwnerOrSystemAdmin($id, (int) $user['id'])) {
            return ['success' => false, 'message' => 'Hanya guru pembuat ruangan atau admin sistem yang bisa mengubah ruangan.'];
        }

        // Pastikan ruangan ada (juga untuk jalur admin yang melewati isOwner)
        $stmt = $this->db->prepare('SELECT id FROM ruangan WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            return ['success' => false, 'message' => 'Ruangan tidak ditemukan.'];
        }

        $this->db->prepare('UPDATE ruangan SET nama = ?, theme_color = ?, last_active_at = NOW() WHERE id = ?')
            ->execute([$nama, $themeColor, $id]);

        return ['success' => true, 'message' => 'Ruangan berhasil diperbarui.', 'nama' => $nama, 'theme_color' => $themeColor];
    }

    /**
     * Detail ruangan + daftar murid yang tergabung.
     * Hanya pemilik ruangan atau admin.
     *
     * @return array{success:bool, message?:string, ruangan?:array, anggota?:array}
     */
    public function members(array $user, int $ruanganId): array
    {
        $this->purgeExpired();

        if (!$this->isOwnerOrAdmin($ruanganId, (int) $user['id'])) {
            return ['success' => false, 'message' => 'Hanya guru atau ketua kelas yang bisa melihat halaman analitik.'];
        }

        $sisa = '999999 AS sisa_detik';
        $stmt = $this->db->prepare(
            "SELECT r.*, u.name AS guru, $sisa,
                    (r.last_active_at > NOW() - INTERVAL " . self::PRESENSI_DETIK . " SECOND) AS ruangan_online
             FROM ruangan r JOIN users u ON u.id = r.user_id WHERE r.id = ?"
        );
        $stmt->execute([$ruanganId]);
        $room = $stmt->fetch();
        if (!$room) {
            return ['success' => false, 'message' => 'Ruangan tidak ditemukan.'];
        }

        $stmt = $this->db->prepare(
            'SELECT u.id, u.name, u.email, cm.joined_at, cm.last_seen_at, cm.role, cm.is_marked, cm.pinned_at,
                    (cm.last_seen_at IS NOT NULL AND cm.last_seen_at > NOW() - INTERVAL ' . self::PRESENSI_DETIK . ' SECOND) AS online
             FROM class_members cm JOIN users u ON u.id = cm.user_id
             WHERE cm.ruangan_id = ?
             ORDER BY cm.pinned_at DESC, cm.joined_at ASC'
        );
        $stmt->execute([$ruanganId]);
        $members = array_map(static function ($m) {
            return [
                'id'           => (int) $m['id'],
                'name'         => $m['name'],
                'email'        => $m['email'],
                'joined_at'    => $m['joined_at'],
                'last_seen_at' => $m['last_seen_at'],
                'role'         => $m['role'],
                'online'       => (bool) $m['online'],
                'is_marked'    => (bool) $m['is_marked'],
                'pinned_at'    => $m['pinned_at'],
            ];
        }, $stmt->fetchAll());

        return [
            'success' => true,
            'ruangan' => [
                'id'            => (int) $room['id'],
                'nama'          => $room['nama'],
                'kode_ruangan'  => $room['kode_ruangan'],
                'user_id'       => (int) $room['user_id'],
                'guru'          => $room['guru'],
                'created_at'    => $room['created_at'],
                'last_active_at'=> $room['last_active_at'],
                'sisa_detik'    => (int) ($room['sisa_detik'] ?? 0),
                'theme_color'   => $room['theme_color'] ?? '#0f172a',
                'online'        => (bool) ($room['ruangan_online'] ?? false),
            ],
            'anggota'  => $members,
        ];
    }

    /**
     * Ambil silabus / skill tree ruangan (nodes & edges ReactFlow).
     * Isi dibaca dari FILE per ruangan (storage/ruangan/<id>.json),
     * bukan dari kolom DB (DB cuma menyimpan pointer file_path).
     * Bisa dibaca oleh anggota, pemilik, atau admin.
     *
     * @return array{success:bool, message?:string, nama?:string, nodes?:array, edges?:array, updated_at?:?string}
     */
    public function getSyllabus(array $user, int $ruanganId): array
    {
        $this->purgeExpired();

        if (!$this->canAccess($user, $ruanganId)) {
            return ['success' => false, 'message' => 'Anda tidak memiliki akses ke ruangan ini.'];
        }

        $stmt = $this->db->prepare(
            'SELECT r.nama, r.theme_color, s.file_path, s.updated_at
             FROM ruangan r LEFT JOIN syllabus s ON s.ruangan_id = r.id
             WHERE r.id = ?'
        );
        $stmt->execute([$ruanganId]);
        $row = $stmt->fetch();
        if (!$row) {
            return ['success' => false, 'message' => 'Ruangan tidak ditemukan.'];
        }

        // Baca isi build dari file (jika ada). Kalau belum pernah disimpan
        // (tidak ada file / belum ada baris syllabus), kembalikan array kosong
        // → frontend menampilkan template awal sampai guru menyimpan.
        // Lokasi file dihormati dari pointer file_path di DB (dengan fallback
        // ke path deterministik + basename agar aman dari path traversal).
        $nodes = [];
        $edges = [];
        $file  = $row['file_path']
            ? self::STORAGE_DIR . '/' . basename((string) $row['file_path'])
            : self::syllabusFilePath($ruanganId);
        if (is_file($file)) {
            $raw = json_decode((string) file_get_contents($file), true);
            if (is_array($raw)) {
                $nodes = is_array($raw['nodes'] ?? null) ? $raw['nodes'] : [];
                $edges = is_array($raw['edges'] ?? null) ? $raw['edges'] : [];
            }
        }

        return [
            'success'    => true,
            'nama'       => $row['nama'],
            'theme_color'=> $row['theme_color'] ?? '#0f172a',
            'nodes'      => $nodes,
            'edges'      => $edges,
            'updated_at' => $row['updated_at'],
        ];
    }

    /**
     * Simpan silabus / skill tree ruangan (nodes & edges ReactFlow).
     * Hanya pemilik ruangan atau admin.
     *
     * Isi build (nodes/edges) ditulis ke FILE per ruangan
     * (storage/ruangan/<id>.json) — bukan ke kolom DB — supaya database
     * tidak membawa karakter yang sangat panjang. DB hanya menyimpan
     * pointer kecil (file_path + updated_at) via upsert.
     */
    public function saveSyllabus(array $user, int $ruanganId, array $nodes, array $edges): array
    {
        $this->purgeExpired();

        if (!$this->isOwnerOrSystemAdmin($ruanganId, (int) $user['id'])) {
            return ['success' => false, 'message' => 'Hanya guru pembuat ruangan atau admin sistem yang bisa menyimpan silabus.'];
        }

        // Pastikan ruangan benar-benar ada (hindari FK exception → HTTP 500)
        $stmt = $this->db->prepare('SELECT id FROM ruangan WHERE id = ?');
        $stmt->execute([$ruanganId]);
        if (!$stmt->fetch()) {
            return ['success' => false, 'message' => 'Ruangan tidak ditemukan.'];
        }

        $file = self::syllabusFilePath($ruanganId);
        $dir  = dirname($file);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        $json = json_encode(
            ['nodes' => $nodes, 'edges' => $edges],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );
        if ($json === false) {
            return ['success' => false, 'message' => 'Data silabus tidak valid.'];
        }

        // Tulis atomik (temp + rename) supaya pembaca tidak pernah
        // melihat file setengah jadi.
        $tmp = $file . '.tmp';
        if (file_put_contents($tmp, $json) === false) {
            return ['success' => false, 'message' => 'Gagal menulis file silabus.'];
        }
        rename($tmp, $file);

        // Pointer kecil di DB (upsert)
        $this->db->prepare(
            'INSERT INTO syllabus (ruangan_id, file_path) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE file_path = VALUES(file_path)'
        )->execute([$ruanganId, 'storage/ruangan/' . $ruanganId . '.json']);

        // Menyimpan = aktivitas → keep-alive timer ruangan
        $this->db->prepare('UPDATE ruangan SET last_active_at = NOW() WHERE id = ?')->execute([$ruanganId]);

        return ['success' => true, 'message' => 'Silabus berhasil disimpan.'];
    }

    /**
     * Keluarkan murid dari ruangan. Hanya pemilik ruangan atau admin.
     */
    public function kick(array $user, int $ruanganId, int $memberUserId): array
    {
        $this->purgeExpired();

        if (!$this->isOwnerOrSystemAdmin($ruanganId, (int) $user['id'])) {
            return ['success' => false, 'message' => 'Hanya guru pembuat ruangan atau admin sistem yang bisa mengeluarkan murid.'];
        }

        $stmt = $this->db->prepare('DELETE FROM class_members WHERE ruangan_id = ? AND user_id = ?');
        $stmt->execute([$ruanganId, $memberUserId]);
        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'message' => 'Murid tidak terdaftar di ruangan ini.'];
        }

        // Hapus histori kuis murid di ruangan ini agar tidak merusak data analitik
        $this->db->prepare('DELETE FROM quiz_attempts WHERE ruangan_id = ? AND user_id = ?')->execute([$ruanganId, $memberUserId]);

        return ['success' => true, 'message' => 'Murid dikeluarkan dari ruangan beserta seluruh historinya.'];
    }

    /**
     * Angkat atau turunkan status ketua kelas. Hanya pemilik ruangan atau admin.
     */
    public function setAdmin(array $user, int $ruanganId, int $memberUserId, string $role): array
    {
        $this->purgeExpired();

        if (!$this->isOwner($ruanganId, (int) $user['id'])) {
            return ['success' => false, 'message' => 'Hanya guru pembuat ruangan yang mengatur jabatan murid.'];
        }

        if (!in_array($role, ['member', 'admin'])) {
            return ['success' => false, 'message' => 'Role tidak valid.'];
        }

        $stmt = $this->db->prepare('UPDATE class_members SET role = ? WHERE ruangan_id = ? AND user_id = ?');
        $stmt->execute([$role, $ruanganId, $memberUserId]);
        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'message' => 'Murid tidak terdaftar di ruangan ini.'];
        }

        $statusMsg = $role === 'admin' ? 'diangkat menjadi Ketua Kelas' : 'diturunkan menjadi Murid Biasa';
        return ['success' => true, 'message' => "Murid berhasil $statusMsg."];
    }

    /**
     * Tandai atau hapus tanda murid. Hanya guru pembuat ruangan yang bisa.
     */
    public function toggleMark(array $user, int $ruanganId, int $memberUserId): array
    {
        if (!$this->isOwner($ruanganId, (int) $user['id'])) {
            return ['success' => false, 'message' => 'Hanya guru pembuat ruangan yang mengatur tanda murid.'];
        }

        $stmt = $this->db->prepare('UPDATE class_members SET is_marked = NOT is_marked WHERE ruangan_id = ? AND user_id = ?');
        $stmt->execute([$ruanganId, $memberUserId]);
        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'message' => 'Murid tidak terdaftar di ruangan ini.'];
        }

        return ['success' => true, 'message' => 'Status tanda murid berhasil diubah.'];
    }

    /**
     * Pin atau unpin murid (pinned murid tampil teratas). Hanya guru pembuat ruangan yang bisa.
     */
    public function togglePin(array $user, int $ruanganId, int $memberUserId): array
    {
        if (!$this->isOwner($ruanganId, (int) $user['id'])) {
            return ['success' => false, 'message' => 'Hanya guru pembuat ruangan yang mengatur pin murid.'];
        }

        $stmt = $this->db->prepare('SELECT pinned_at FROM class_members WHERE ruangan_id = ? AND user_id = ?');
        $stmt->execute([$ruanganId, $memberUserId]);
        $row = $stmt->fetch();
        if (!$row) {
            return ['success' => false, 'message' => 'Murid tidak terdaftar di ruangan ini.'];
        }

        if ($row['pinned_at']) {
            $this->db->prepare('UPDATE class_members SET pinned_at = NULL WHERE ruangan_id = ? AND user_id = ?')
                     ->execute([$ruanganId, $memberUserId]);
            return ['success' => true, 'message' => 'Pin murid berhasil dilepas.'];
        } else {
            $this->db->prepare('UPDATE class_members SET pinned_at = NOW() WHERE ruangan_id = ? AND user_id = ?')
                     ->execute([$ruanganId, $memberUserId]);
            return ['success' => true, 'message' => 'Murid berhasil dipin.'];
        }
    }

    /**
     * Heartbeat kehadiran: browser yang sedang berada di ruangan menjawab
     * "Ya, ada" setiap beberapa menit (dipanggil React via useRoomHeartbeat).
     * - Memperbarui last_seen_at murid (untuk status online per murid).
     * - Memperbarui last_active_at ruangan (keep-alive timer 2 jam).
     * Jika browser ditutup / tidak respons, sinyal berhenti → ruangan lama
     * kelamaan "Tidak ada" dan akhirnya kedaluwarsa.
     * Hanya anggota / pemilik ruangan (atau admin) yang boleh.
     */
    public function heartbeat(array $user, int $ruanganId): array
    {
        $this->purgeExpired();

        $uid     = (int) $user['id'];
        if (!$this->isOwner($ruanganId, $uid)) {
            $stmt = $this->db->prepare('SELECT id FROM class_members WHERE ruangan_id = ? AND user_id = ?');
            $stmt->execute([$ruanganId, $uid]);
            if (!$stmt->fetch()) {
                return ['success' => false, 'message' => 'Anda bukan anggota ruangan ini.'];
            }
        }

        // Catat kehadiran per murid (owner bukan member → 0 baris, tidak apa-apa)
        $this->db->prepare('UPDATE class_members SET last_seen_at = NOW() WHERE ruangan_id = ? AND user_id = ?')
            ->execute([$ruanganId, $uid]);
        // Keep-alive ruangan
        $this->db->prepare('UPDATE ruangan SET last_active_at = NOW() WHERE id = ?')->execute([$ruanganId]);

        return ['success' => true, 'message' => 'Hadir.'];
    }

    /**
     * Tandai ruangan aktif (reset hitung mundur 2 jam).
     * Hanya boleh dilakukan anggota/owner ruangan (atau admin).
     */
    public function touch(array $user, int $id): bool
    {
        if (!$this->isOwner($id, (int) $user['id'])) {
            $stmt = $this->db->prepare('SELECT id FROM class_members WHERE ruangan_id = ? AND user_id = ?');
            $stmt->execute([$id, (int) $user['id']]);
            if (!$stmt->fetch()) {
                return false; // bukan anggota ruangan ini
            }
        }

        $this->db->prepare('UPDATE ruangan SET last_active_at = NOW() WHERE id = ?')->execute([$id]);
        return true;
    }

    // ------------------------------------------------------------
    // Helper internal
    // ------------------------------------------------------------

    /** Kode unik 6 karakter (tanpa O/0/I/1 agar mudah dibaca). */
    private function generateKode(): string
    {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        do {
            $kode = '';
            for ($i = 0; $i < 6; $i++) {
                $kode .= $chars[random_int(0, strlen($chars) - 1)];
            }
            $stmt = $this->db->prepare('SELECT id FROM ruangan WHERE kode_ruangan = ?');
            $stmt->execute([$kode]);
        } while ($stmt->fetch());

        return $kode;
    }

    /** Path file build silabus per ruangan. */
    private static function syllabusFilePath(int $ruanganId): string
    {
        return self::STORAGE_DIR . '/' . $ruanganId . '.json';
    }

    /** Hapus file build silabus ruangan (jika ada). */
    private function deleteSyllabusFile(int $ruanganId): void
    {
        $file = self::syllabusFilePath($ruanganId);
        if (is_file($file) && !@unlink($file)) {
            error_log("[RuanganLogic] Gagal menghapus file silabus: $file");
        }
    }

    private function isOwner(int $ruanganId, int $userId): bool
    {
        $stmt = $this->db->prepare('SELECT user_id FROM ruangan WHERE id = ?');
        $stmt->execute([$ruanganId]);
        $row = $stmt->fetch();
        return (bool) $row && (int) $row['user_id'] === $userId;
    }

    private function isOwnerOrAdmin(int $ruanganId, int $userId): bool
    {
        if ($this->isOwner($ruanganId, $userId)) {
            return true;
        }
        $stmt = $this->db->prepare("SELECT id FROM class_members WHERE ruangan_id = ? AND user_id = ? AND role = 'admin'");
        $stmt->execute([$ruanganId, $userId]);
        return (bool) $stmt->fetch();
    }

    /**
     * Cek apakah user adalah pemilik ruangan ATAU admin sistem.
     * TIDAK termasuk ketua kelas (class member admin).
     */
    private function isOwnerOrSystemAdmin(int $ruanganId, int $userId): bool
    {
        if ($this->isOwner($ruanganId, $userId)) {
            return true;
        }
        // Cek apakah user adalah admin sistem (role = 'admin' di tabel users)
        $stmt = $this->db->prepare('SELECT role FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        return $row && ($row['role'] ?? '') === 'admin';
    }

    private function canAccess(array $user, int $ruanganId): bool
    {
        if ($this->isOwner($ruanganId, (int) $user['id'])) {
            return true;
        }
        $stmt = $this->db->prepare('SELECT id FROM class_members WHERE ruangan_id = ? AND user_id = ?');
        $stmt->execute([$ruanganId, (int) $user['id']]);
        return (bool) $stmt->fetch();
    }
}
