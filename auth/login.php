<?php
// ============================================================
// auth/login.php — API login (PHP = backend murni, respons JSON)
// ============================================================
// Dipanggil oleh UI React (frontend/src/pages/Login.jsx) via fetch.
//
//   POST /FlacTopus/auth/login.php
//   Body (JSON): { "email": "...", "password": "..." }
//   Header: X-CSRF-Token (dari auth/session.php)
//
// Respons sukses : 200 { success:true, message, user:{id,name,email,role} }
// Respons gagal   : 401 { success:false, message }
// ============================================================

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/../backend/controller/logic/RateLimiter.php';
require_once __DIR__ . '/../backend/controller/logic/ActivityLogger.php';

// Hanya menerima POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Method tidak diizinkan.'], 405);
}

// Perlindungan CSRF (header token)
if (!csrf_header_verify()) {
    json_response(['success' => false, 'message' => 'Sesi tidak valid. Muat ulang halaman.'], 403);
}

// --- IP-based Rate Limiter (loopback otomatis di-skip oleh class) ---
$rawIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$ip    = trim(explode(',', $rawIp)[0]);
$limiter = new RateLimiter();
$rate    = $limiter->check($ip);

if (!$rate['allowed']) {
    $minutes = (int) ceil($rate['retry_after'] / 60);
    // Catat percobaan rate-limited
    $logger = new ActivityLogger();
    $logger->log(null, 'rate_limited');
    json_response([
        'success'    => false,
        'message'    => "Terlalu banyak percobaan gagal. Coba lagi dalam {$minutes} menit.",
        'retry_after'=> $rate['retry_after'],
    ], 429);
}

// --- Session-based Rate Limiter (dual lockout) ---
start_session();
$sessionFailCount = (int) ($_SESSION['login_fail_count'] ?? 0);
$sessionLockedUntil = (int) ($_SESSION['login_locked_until'] ?? 0);

// Cek apakah session sudah di-lock
if ($sessionLockedUntil > 0 && time() < $sessionLockedUntil) {
    $remaining = $sessionLockedUntil - time();
    $minutes = (int) ceil($remaining / 60);
    json_response([
        'success'    => false,
        'message'    => "Terlalu banyak percobaan gagal. Coba lagi dalam {$minutes} menit.",
        'retry_after'=> $remaining,
    ], 429);
}
// Bersihkan lock yang sudah expired
if ($sessionLockedUntil > 0 && time() >= $sessionLockedUntil) {
    $_SESSION['login_fail_count'] = 0;
    unset($_SESSION['login_locked_until']);
    $sessionFailCount = 0;
}

$body     = read_json_body();
$email    = (string) ($body['email'] ?? '');
$password = (string) ($body['password'] ?? '');

try {
    $logic  = new LoginRegisterLogic();
    $result = $logic->login($email, $password);
    $logger = new ActivityLogger();

    if ($result['success']) {
        // Login berhasil → reset semua counter
        $limiter->clear($ip);
        $_SESSION['login_fail_count'] = 0;
        unset($_SESSION['login_locked_until']);

        // Simpan session ID ke DB (anti session hijacking)
        $userId = $result['user']['id'] ?? null;
        if ($userId) {
            $currentSid = session_id();
            $db = db();
            $stmt = $db->prepare('UPDATE users SET last_session_id = ? WHERE id = ?');
            $stmt->execute([$currentSid, $userId]);
            $_SESSION['last_session_id'] = $currentSid;
        }

        // Catat login berhasil
        $logger->log($userId, 'login');

        json_response([
            'success' => true,
            'message' => $result['message'],
            'user'    => $result['user'],
        ]);
    }

    // Login gagal → catat di IP-based DAN session-based
    $limiter->recordFailure($ip);
    $logger->log(null, 'login_failed');

    // Session-based lockout: 5 gagal → lock 5 menit
    $_SESSION['login_fail_count'] = $sessionFailCount + 1;
    if ($_SESSION['login_fail_count'] >= 5) {
        $_SESSION['login_locked_until'] = time() + 300; // 5 menit
        $_SESSION['login_fail_count'] = 0;
    }

    // Sisa percobaan (dari IP-based)
    $remaining = max(0, $rate['remaining'] - 1);
    $msg = $result['message'];
    if ($remaining <= 2 && $remaining > 0) {
        $msg .= " (Sisa percobaan: {$remaining})";
    }

    json_response(['success' => false, 'message' => $msg], 401);
} catch (PDOException $e) {
    json_response(['success' => false, 'message' => 'Gagal terhubung ke database.'], 500);
}
