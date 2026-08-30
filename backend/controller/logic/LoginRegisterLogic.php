<?php
// ============================================================
// backend/controller/logic/LoginRegisterLogic.php
// Logika bisnis autentikasi: register, login, session (PHP)
//
// Dipakai oleh: auth/login.php, auth/register.php
//
// Prasyarat:
//   - auth/config.php sudah di-include (fungsi db(), start_session()
//     tersedia) ATAU PDO diteruskan lewat konstruktor.
//   - Tabel dari db/schema.sql sudah dibuat (users, ...).
// ============================================================

declare(strict_types=1);

class LoginRegisterLogic
{
    private PDO $db;

    public function __construct(?PDO $pdo = null)
    {
        $this->db = $pdo ?? db();
    }

    /**
     * Mendaftarkan akun baru (guru/murid).
     *
     * @param string $status Status awal akun ('pending' atau 'active')
     * @return array{success: bool, message: string, user_id?: int}
     */
    public function register(string $name, string $email, string $password, string $role, string $status = 'pending'): array
    {
        $name  = trim($name);
        $email = strtolower(trim($email));
        $role  = trim($role);
        $status = trim($status);

        // RBAC: hanya student dan teacher yang bisa daftar
        if (!in_array($role, ['student', 'teacher'], true)) {
            return ['success' => false, 'message' => 'Role tidak valid.'];
        }

        // Validasi status
        if (!in_array($status, ['pending', 'active'], true)) {
            $status = 'pending'; // Default ke pending jika tidak valid
        }

        // --- Validasi input ---
        if (mb_strlen($name) < 3) {
            return ['success' => false, 'message' => 'Nama minimal 3 karakter.'];
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => 'Format email tidak valid.'];
        }
        if (strlen($password) < 8) {
            return ['success' => false, 'message' => 'Password minimal 8 karakter.'];
        }
        if (strlen($password) > 72) {
            // bcrypt hanya memakai 72 byte pertama; batasi agar tidak terpotong diam-diam
            return ['success' => false, 'message' => 'Password maksimal 72 karakter.'];
        }

        // --- Cek email sudah terdaftar (prepared statement = anti SQL injection) ---
        $stmt = $this->db->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            return ['success' => false, 'message' => 'Email sudah terdaftar. Silakan login.'];
        }

        // --- Simpan dengan password ter-hash (bcrypt) ---
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $this->db->prepare(
            'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$name, $email, $hash, $role, $status]);

        $userId = (int) $this->db->lastInsertId();

        // Jika status active → auto-login (buat session)
        if ($status === 'active') {
            start_session();
            session_regenerate_id(true);
            $_SESSION['user'] = [
                'id'    => $userId,
                'name'  => $name,
                'email' => $email,
                'role'  => $role,
            ];
            $_SESSION['last_activity'] = time();

            return [
                'success'     => true,
                'message'     => 'Registrasi berhasil! Selamat datang, ' . $name . '.',
                'user_id'     => $userId,
                'auto_login'  => true,
                'user'        => $_SESSION['user'],
            ];
        }

        return [
            'success'     => true,
            'message'     => 'Registrasi berhasil! Akun Anda menunggu persetujuan admin. Anda akan bisa login setelah disetujui.',
            'user_id'     => $userId,
            'auto_login'  => false,
        ];
    }

    /**
     * Login: verifikasi kredensial lalu buat session.
     *
     * @return array{success: bool, message: string, user?: array{id:int,name:string,email:string,role:string}}
     */
    public function login(string $email, string $password): array
    {
        $email = strtolower(trim($email));

        $stmt = $this->db->prepare(
            'SELECT id, name, email, password_hash, role, status FROM users WHERE email = ?'
        );
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            // Jawaban seragam agar tidak bocor akun mana yang terdaftar
            return ['success' => false, 'message' => 'Email atau password salah.'];
        }

        // --- Cek status akun ---
        if (($user['status'] ?? 'active') === 'pending') {
            return ['success' => false, 'message' => 'Akun Anda masih menunggu persetujuan admin. Silakan coba lagi nanti.', 'pending' => true];
        }
        if (($user['status'] ?? 'active') === 'rejected') {
            return ['success' => false, 'message' => 'Akun Anda telah ditolak oleh admin.'];
        }

        // --- Regenerasi session ID untuk cegah session fixation ---
        start_session();
        session_regenerate_id(true);
        $_SESSION['user'] = [
            'id'    => (int) $user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'role'  => $user['role'],
        ];
        $_SESSION['last_activity'] = time(); // mulai hitung idle sejak login

        return [
            'success' => true,
            'message' => 'Login berhasil! Selamat datang, ' . $user['name'] . '.',
            'user'    => $_SESSION['user'],
        ];
    }

    // ------------------------------------------------------------
    // Session helpers
    // ------------------------------------------------------------
    public function isLoggedIn(): bool
    {
        start_session();
        return !empty($_SESSION['user']);
    }

    public function currentUser(): ?array
    {
        start_session();
        return $_SESSION['user'] ?? null;
    }

    public function logout(): void
    {
        start_session();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
    }
}
