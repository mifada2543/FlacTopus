<?php
// ============================================================
// auth/config.example.php â€” TEMPLATE konfigurasi aplikasi
// ============================================================
// Cara pakai:
//   1. Salin file ini menjadi config.php
//        cp auth/config.example.php auth/config.php
//   2. Sesuaikan kredensial database & API key di bawah
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
const SESSION_NAME = 'FlacTopus';
const SESSION_LIFETIME = 7200;      // Masa berlaku maksimal sesi (detik) = 2 jam
const SESSION_IDLE_TIMEOUT = 1800;  // Auto-logout bila idle (detik) = 30 menit

// --- Gemini API (backend proxy) ---
// API key hanya disimpan di server, TIDAK PERNAH dikirim ke frontend.
// Dapatkan key gratis di: https://aistudio.google.com/apikey
// Batasi key di Google Cloud Console â†’ Application restrictions â†’ HTTP referrers.
const GEMINI_API_KEY = 'YOUR_API_KEY_HERE';

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
    // Opsi cookie sesi â€” dipakai saat start awal maupun restart setelah idle.
    // cookie_lifetime = masa berlaku ABSOLUT (2 jam dihitung sejak sesi dibuat,
    // mis. saat login); idle timeout (30 menit) bersifat geser/sliding. Jadi
    // pengguna yang aktif pun tetap logout saat genap 2 jam.
    //
    // Secure flag: dynamic â€” hanya aktif jika HTTPS terdeteksi.
    // (MEeL pattern: cek HTTPS + X-Forwarded-Proto)
    $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
             || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https');

    $opts = [
        'cookie_lifetime' => SESSION_LIFETIME,
        'cookie_httponly' => true,
        'cookie_secure'  => $isSecure,
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
    return is_array($data) ? $data : [];
}

// ------------------------------------------------------------
// Security Headers (MEeL pattern)
// ------------------------------------------------------------
// Dikirim oleh config.php yang di-include oleh semua halaman.
// Headers ini melindungi dari clickjacking, MIME sniffing, dll.
if (!headers_sent()) {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    header('Cross-Origin-Opener-Policy: same-origin');
    // HSTS hanya jika HTTPS
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        header('Strict-Transport-Security: max-age=15552000; includeSubDomains');
    }
}

// ------------------------------------------------------------
// Back URL Validation (MEeL pattern)
// Mencegah open redirect: hanya izinkan redirect ke halaman yang
// benar-benar berasal dari origin yang sama.
// ------------------------------------------------------------
function safe_back_url(string $default = '/classes'): string
{
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    if ($referer === '') {
        return $default;
    }
    $refHost = parse_url($referer, PHP_URL_HOST);
    $appHost = parse_url(BASE_URL, PHP_URL_HOST);
    // Hanya izinkan jika host cocok (case-insensitive)
    if ($refHost !== null && $appHost !== null && strcasecmp($refHost, $appHost) === 0) {
        $path = parse_url($referer, PHP_URL_PATH) ?? '';
        // Tolak jika referer ke halaman auth (login/register) untuk cegah loop
        if (strpos($path, 'login') === false && strpos($path, 'register') === false) {
            return $referer;
        }
    }
    return $default;
}

// ================================================================
// AUTO GARBAGE COLLECTION (periodik, max 1x per jam)
// ================================================================
// Dijalankan sekali per request (jika sudah waktunya). Anti double-run
// di-handle oleh GarbageCollector::shouldRun() via file timestamp.
// Gunakan background supaya tidak memperlambat response user.
// ================================================================
if (PHP_SAPI !== 'cli' && !headers_sent()) {
    $gcFile = __DIR__ . '/../backend/controller/logic/GarbageCollector.php';
    $gcStamp = __DIR__ . '/../storage/.gc_last_run';
    $gcReady = true;

    // Cek interval minimum (1 jam)
    if (is_file($gcStamp)) {
        $lastRun = (int) file_get_contents($gcStamp);
        if ((time() - $lastRun) < 3600) {
            $gcReady = false;
        }
    }

    if ($gcReady && is_file($gcFile)) {
        try {
            require_once $gcFile;
            $gc = new GarbageCollector();
            $gc->run();
        } catch (Throwable $e) {
            // GC gagal â€” jangan ganggu request user
            error_log('[GC] Auto-run error: ' . $e->getMessage());
        }
    }
}

