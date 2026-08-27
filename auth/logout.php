<?php
// ============================================================
// auth/logout.php — API logout (PHP = backend murni, JSON)
// ============================================================
// Dipanggil oleh UI React saat tombol "Keluar" diklik.
//
//   POST /FlacTopus/auth/logout.php
//   Header: X-CSRF-Token (dari auth/session.php)
//
// Respons: 200 { success:true, message }
// ============================================================

require_once __DIR__ . '/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Method tidak diizinkan.'], 405);
}

if (!csrf_header_verify()) {
    json_response(['success' => false, 'message' => 'Sesi tidak valid.'], 403);
}

$logic = new LoginRegisterLogic();
$logic->logout();

json_response(['success' => true, 'message' => 'Berhasil keluar.']);
