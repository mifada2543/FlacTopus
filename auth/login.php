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

// Hanya menerima POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Method tidak diizinkan.'], 405);
}

// Perlindungan CSRF (header token)
if (!csrf_header_verify()) {
    json_response(['success' => false, 'message' => 'Sesi tidak valid. Muat ulang halaman.'], 403);
}

$body     = read_json_body();
$email    = (string) ($body['email'] ?? '');
$password = (string) ($body['password'] ?? '');

try {
    $logic  = new LoginRegisterLogic();
    $result = $logic->login($email, $password);

    if ($result['success']) {
        json_response([
            'success' => true,
            'message' => $result['message'],
            'user'    => $result['user'],
        ]);
    }
    json_response(['success' => false, 'message' => $result['message']], 401);
} catch (PDOException $e) {
    json_response(['success' => false, 'message' => 'Gagal terhubung ke database.'], 500);
}
