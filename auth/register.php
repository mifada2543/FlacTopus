<?php
// ============================================================
// auth/register.php — API daftar akun (PHP = backend murni, JSON)
// ============================================================
// Dipanggil oleh UI React (frontend/src/pages/Register.jsx) via fetch.
//
//   POST /FlacTopus/auth/register.php
//   Body (JSON): { name, email, password }
//   Header: X-CSRF-Token (dari auth/session.php)
//
// Respons sukses : 200 { success:true, message }
// Respons gagal   : 400 { success:false, message }
// ============================================================

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/../backend/controller/logic/RateLimiter.php';
require_once __DIR__ . '/../backend/controller/logic/ActivityLogger.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Method tidak diizinkan.'], 405);
}

if (!csrf_header_verify()) {
    json_response(['success' => false, 'message' => 'Sesi tidak valid. Muat ulang halaman.'], 403);
}

// --- Rate Limiter: cek apakah IP masih boleh register (loopback otomatis di-skip) ---
$rawIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$ip    = trim(explode(',', $rawIp)[0]);
$limiter = new RateLimiter();
$rate    = $limiter->check($ip, 'register');

if (!$rate['allowed']) {
    $minutes = (int) ceil($rate['retry_after'] / 60);
    $logger = new ActivityLogger();
    $logger->log(null, 'register_rate_limited');
    json_response([
        'success'    => false,
        'message'    => "Terlalu banyak percobaan registrasi. Coba lagi dalam {$minutes} menit.",
        'retry_after'=> $rate['retry_after'],
    ], 429);
}

$body     = read_json_body();
$name     = (string) ($body['name'] ?? '');
$email    = (string) ($body['email'] ?? '');
$password = (string) ($body['password'] ?? '');
$role     = 'student'; // Selalu murid — guru hanya bisa dibuat oleh admin

try {
    $logic  = new LoginRegisterLogic();
    $result = $logic->register($name, $email, $password, $role);
    $logger = new ActivityLogger();

    if ($result['success']) {
        // Register berhasil → reset counter rate limit
        $limiter->clear($ip, 'register');
        $logger->log($result['user_id'] ?? null, 'register');
        json_response(['success' => true, 'message' => $result['message']]);
    }

    // Register gagal → catat percobaan
    $limiter->recordFailure($ip, 'register');
    $logger->log(null, 'register_failed');

    // Sisa percobaan
    $remaining = max(0, $rate['remaining'] - 1);
    $msg = $result['message'];
    if ($remaining <= 1 && $remaining > 0) {
        $msg .= " (Sisa percobaan: {$remaining})";
    }

    json_response(['success' => false, 'message' => $msg], 400);
} catch (PDOException $e) {
    json_response(['success' => false, 'message' => 'Gagal terhubung ke database.'], 500);
}
