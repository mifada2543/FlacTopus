<?php
// ============================================================
// auth/register.php — API daftar akun (PHP = backend murni, JSON)
// ============================================================
// Dipanggil oleh UI React (frontend/src/pages/Register.jsx) via fetch.
//
//   POST /FlacTopus/auth/register.php
//   Body (JSON): { name, email, password, role: 'teacher'|'student' }
//   Header: X-CSRF-Token (dari auth/session.php)
//
// Respons sukses : 200 { success:true, message }
// Respons gagal   : 400 { success:false, message }
// ============================================================

require_once __DIR__ . '/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Method tidak diizinkan.'], 405);
}

if (!csrf_header_verify()) {
    json_response(['success' => false, 'message' => 'Sesi tidak valid. Muat ulang halaman.'], 403);
}

$body     = read_json_body();
$name     = (string) ($body['name'] ?? '');
$email    = (string) ($body['email'] ?? '');
$password = (string) ($body['password'] ?? '');
$role     = (string) ($body['role'] ?? 'student');

try {
    $logic  = new LoginRegisterLogic();
    $result = $logic->register($name, $email, $password, $role);

    if ($result['success']) {
        json_response(['success' => true, 'message' => $result['message']]);
    }
    json_response(['success' => false, 'message' => $result['message']], 400);
} catch (PDOException $e) {
    json_response(['success' => false, 'message' => 'Gagal terhubung ke database.'], 500);
}
