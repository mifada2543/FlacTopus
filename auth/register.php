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
require_once __DIR__ . '/../backend/controller/logic/MasterKeyLogic.php';

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

// --- Honeypot Check: jika field terisi → bot terdeteksi ---
$body      = read_json_body();
$honeypot  = (string) ($body['website'] ?? '');
if ($honeypot !== '') {
    // Bot terdeteksi — catat tapi jangan kasih tahu bot alasannya
    $logger = new ActivityLogger();
    $logger->log(null, 'register_honeypot_caught');
    json_response(['success' => false, 'message' => 'Registrasi gagal. Silakan coba lagi.'], 400);
}

$name     = (string) ($body['name'] ?? '');
$email    = (string) ($body['email'] ?? '');
$password = (string) ($body['password'] ?? '');
$role     = (string) ($body['role'] ?? 'student');
$masterKey = (string) ($body['master_key'] ?? '');

// --- Validasi Role ---
if (!in_array($role, ['student', 'teacher'], true)) {
    json_response(['success' => false, 'message' => 'Role tidak valid.'], 400);
}

// --- Cek Auto-Approve Setting ---
$autoApprove = false;
if ($role === 'student') {
    $db = db();
    // Cek apakah tabel app_settings ada (migration v8)
    $tableCheck = $db->query("SHOW TABLES LIKE 'app_settings'");
    if ($tableCheck && $tableCheck->fetch()) {
        $stmt = $db->prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?');
        $stmt->execute(['student_auto_approve']);
        $row = $stmt->fetch();
        $autoApprove = ($row && $row['setting_value'] === '1');
    }
}

// --- Validasi Master Key untuk Guru (opsional) ---
$status = $autoApprove ? 'active' : 'pending'; // Default: pending (atau active jika auto_approve ON)

if ($role === 'teacher') {
    $mkLogic = new MasterKeyLogic();
    
    if ($masterKey !== '') {
        // Ada master key → cek validitas
        $validation = $mkLogic->validate($masterKey);
        
        if ($validation['valid']) {
            // Master key valid → status langsung aktif
            $status = 'active';
        } else {
            // Master key tidak valid → tolak
            json_response(['success' => false, 'message' => $validation['message']], 400);
        }
    } else {
        // Tanpa master key → status pending (perlu approval admin)
        $status = 'pending';
    }
}

try {
    $logic  = new LoginRegisterLogic();
    $result = $logic->register($name, $email, $password, $role, $status);
    $logger = new ActivityLogger();

    if ($result['success']) {
        // Register berhasil → reset counter rate limit
        $limiter->clear($ip, 'register');
        
        // Jika guru dengan master key → tandai key sudah dipakai
        if ($role === 'teacher' && $masterKey !== '' && isset($result['user_id'])) {
            $mkLogic->markUsed($masterKey, $result['user_id']);
        }
        
        $logger->log($result['user_id'] ?? null, 'register');

        // Return auto_login info untuk frontend
        $response = ['success' => true, 'message' => $result['message']];
        if (!empty($result['auto_login'])) {
            $response['auto_login'] = true;
            $response['user'] = $result['user'] ?? null;
        }
        json_response($response);
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
