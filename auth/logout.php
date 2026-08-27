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

// Simpan user ID sebelum session di-destroy
start_session();
$userId = $_SESSION['user']['id'] ?? null;

// Clear last_session_id dari DB sebelum destroy session
// (mencegah session hijacking: session lama tidak valid lagi)
if ($userId) {
    try {
        $stmt = db()->prepare('UPDATE users SET last_session_id = NULL WHERE id = ?');
        $stmt->execute([(int) $userId]);
    } catch (PDOException $e) {
        error_log('[logout] Gagal clear last_session_id: ' . $e->getMessage());
    }
}

$logic = new LoginRegisterLogic();
$logic->logout();

// Catat aktivitas logout (menggunakan $userId yang sudah disimpan)
try {
    require_once __DIR__ . '/../backend/controller/logic/ActivityLogger.php';
    $logger = new ActivityLogger();
    $logger->log($userId, 'logout');
} catch (Exception $e) {
    // Best effort — jangan gagalkan logout
}

json_response(['success' => true, 'message' => 'Berhasil keluar.']);
