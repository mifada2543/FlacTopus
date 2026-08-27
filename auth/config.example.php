<?php
// ============================================================
// auth/config.example.php — TEMPLATE konfigurasi aplikasi
// ============================================================
// Cara pakai:
//   1. Salin file ini menjadi config.php
//        cp auth/config.example.php auth/config.php
//   2. Sesuaikan kredensial database di bawah dengan MySQL kamu
//   3. JANGAN commit config.php (sudah di-gitignore)
// ============================================================

declare(strict_types=1);

// --- Database (default XAMPP: root tanpa password) ---
const DB_HOST = 'localhost';
const DB_PORT = 3306;
const DB_NAME = 'project_lomba';
const DB_USER = 'root';
const DB_PASS = '';

// --- URL aplikasi (untuk redirect setelah login) ---
const BASE_URL = 'http://localhost/FlacTopus';
// Path tujuan setelah login (RELATIF, akan diprefiks BASE_URL oleh redirect()).
// Arahkan sesuai role; bisa diubah nanti (mis. guru -> '/admin/')
const REDIRECT_TEACHER = '/';
const REDIRECT_STUDENT = '/';

// --- Session ---
const SESSION_NAME = 'PLomba';
const SESSION_LIFETIME = 7200;      // Masa berlaku maksimal sesi (detik) = 2 jam
const SESSION_IDLE_TIMEOUT = 1800;  // Auto-logout bila idle (detik) = 30 menit

/**
 * Membuat koneksi PDO ke MySQL (singleton).
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

/**
 * Memulai session dengan cookie yang lebih aman.
 * (Panggil di awal halaman PHP, sebelum output apa pun.)
 */
function start_session(): void
{
    // Opsi cookie sesi — dipakai saat start awal maupun restart setelah idle.
    // cookie_lifetime = masa berlaku ABSOLUT (2 jam dihitung sejak sesi dibuat,
    // mis. saat login); idle timeout (30 menit) bersifat geser/sliding. Jadi
    // pengguna yang aktif pun tetap logout saat genap 2 jam.
    $opts = [
        'cookie_lifetime' => SESSION_LIFETIME,
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
        // Cookie hanya dikirim ke aplikasi ini, bukan seluruh localhost
        'cookie_path' => parse_url(BASE_URL, PHP_URL_PATH) ?: '/',
    ];

    if (session_status() === PHP_SESSION_NONE) {
        // Tolak session ID yang disuplai pihak luar (anti session fixation)
        ini_set('session.use_strict_mode', '1');
        // Data sesi di server bertahan maksimal SESSION_LIFETIME (mis. 2 jam)
        ini_set('session.gc_maxlifetime', (string) SESSION_LIFETIME);
        session_name(SESSION_NAME);
        session_start($opts);
    }

    // --- Auto-logout saat idle (hanya sesi yang sudah login) ---
    if (!empty($_SESSION['user'])) {
        $last = (int) ($_SESSION['last_activity'] ?? 0);
        if ($last > 0 && (time() - $last) > SESSION_IDLE_TIMEOUT) {
            // Terlalu lama tidak beraktivitas -> hancurkan sesi
            $_SESSION = [];
            session_destroy();
            // Mulai ulang sesi bersih (user kosong + CSRF token baru)
            session_start($opts);
            return;
        }
        // Perpanjang aktivitas terakhir pada setiap request
        $_SESSION['last_activity'] = time();
    }
}

/**
 * Redirect ke path relatif aplikasi (otomatis diprefiks BASE_URL).
 */
function redirect(string $path): void
{
    header('Location: ' . BASE_URL . $path);
    exit;
}

// ------------------------------------------------------------
// CSRF protection (perlindungan form dari serangan CSRF)
// ------------------------------------------------------------
function csrf_token(): string
{
    start_session();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf_token" value="' . csrf_token() . '">';
}

function csrf_verify(): bool
{
    $sent = $_POST['csrf_token'] ?? '';
    return is_string($sent) && $sent !== '' && hash_equals(csrf_token(), $sent);
}

/**
 * Verifikasi token CSRF header X-CSRF-Token (untuk API JSON).
 * Klien wajib mengambil token dulu dari auth/session.php (dilakukan otomatis
 * oleh useAuth/Login/Register), lalu mengirimkannya pada setiap request POST.
 */
function csrf_header_verify(): bool
{
    start_session();
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    return is_string($sent) && $sent !== '' && hash_equals(csrf_token(), $sent);
}

// ------------------------------------------------------------
// Helper respons JSON (PHP sebagai API murni)
// ------------------------------------------------------------
function json_response(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function read_json_body(): array
{
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $_POST;
}
