<?php
// ============================================================
// backend/controller/api/admin.php — API Admin: Kelola User
// ============================================================
// Endpoint REST untuk fitur admin panel.
//
//   GET  .../admin.php
//        → daftar semua user + statistik
//
//   GET  .../admin.php?action=stats
//        → statistik jumlah user per role & status
//
//   POST .../admin.php   (wajib header X-CSRF-Token)
//     { "action": "approve", "user_id": 5 }        → approve user pending
//     { "action": "reject", "user_id": 5 }          → tolak user pending
//     { "action": "change_role", "user_id": 5, "role": "teacher" }
//     { "action": "delete", "user_id": 5 }           → hapus user
//     { "action": "reset_password", "user_id": 5, "new_password": "..." }
//
// Keamanan:
//   - Wajib login + role admin
//   - POST wajib CSRF token
// ============================================================

require_once __DIR__ . '/../../../auth/auth.php';
require_once __DIR__ . '/../logic/ActivityLogger.php';

// Hanya admin yang boleh mengakses
$user = require_role_json([ROLE_ADMIN]);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ------------------------------------------------------------ GET
if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    $db = db();

    // --- Statistik user ---
    if ($action === 'stats') {
        $stmt = $db->query(
            "SELECT
                COUNT(*) AS total,
                SUM(role = 'student') AS total_student,
                SUM(role = 'teacher') AS total_teacher,
                SUM(role = 'admin') AS total_admin,
                SUM(status = 'pending') AS total_pending,
                SUM(status = 'active') AS total_active,
                SUM(status = 'rejected') AS total_rejected
             FROM users"
        );
        $stats = $stmt->fetch();
        json_response(['success' => true, 'stats' => $stats]);
    }

    // --- Activity logs ---
    if ($action === 'activity_logs') {
        $logger = new ActivityLogger();
        $page    = max(1, (int) ($_GET['page'] ?? 1));
        $perPage = min(100, max(1, (int) ($_GET['per_page'] ?? 20)));
        $offset  = ($page - 1) * $perPage;

        $logs = $logger->getLogs([
            'search'   => $_GET['user_filter'] ?? '',
            'action'   => $_GET['action_filter'] ?? '',
            'limit'    => $perPage,
            'offset'   => $offset,
        ]);
        $totalPages = max(1, (int) ceil($logs['total'] / $perPage));

        json_response([
            'success'    => true,
            'logs'       => $logs['logs'],
            'total'      => $logs['total'],
            'total_pages'=> $totalPages,
            'page'       => $page,
        ]);
    }

    // --- Activity stats ---
    if ($action === 'activity_stats') {
        $logger = new ActivityLogger();
        $stats = $logger->getStats();
        json_response(['success' => true, 'stats' => $stats]);
    }

    // --- Daftar semua user ---
    $search = $_GET['search'] ?? '';
    $filterRole = $_GET['role'] ?? '';
    $filterStatus = $_GET['status'] ?? '';

    $where = [];
    $params = [];

    if ($search !== '') {
        $where[] = '(name LIKE ? OR email LIKE ?)';
        $params[] = "%{$search}%";
        $params[] = "%{$search}%";
    }
    if ($filterRole !== '' && in_array($filterRole, ['student', 'teacher', 'admin'], true)) {
        $where[] = 'role = ?';
        $params[] = $filterRole;
    }
    if ($filterStatus !== '' && in_array($filterStatus, ['pending', 'active', 'rejected'], true)) {
        $where[] = 'status = ?';
        $params[] = $filterStatus;
    }

    $sql = 'SELECT id, name, email, role, status, created_at FROM users';
    if (!empty($where)) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY created_at DESC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    // Konversi id ke integer agar JSON bersih
    $users = array_map(fn($u) => [
        'id'         => (int) $u['id'],
        'name'       => $u['name'],
        'email'      => $u['email'],
        'role'       => $u['role'],
        'status'     => $u['status'],
        'created_at' => $u['created_at'],
    ], $users);

    json_response(['success' => true, 'users' => $users]);
}

// ------------------------------------------------------------ POST
if ($method === 'POST') {
    if (!csrf_header_verify()) {
        json_response(['success' => false, 'message' => 'Sesi tidak valid.'], 403);
    }

    $body   = read_json_body();
    $action = (string) ($body['action'] ?? '');
    $db     = db();
    $logger = new ActivityLogger();

    switch ($action) {
        // --- Approve user pending ---
        case 'approve':
            $userId = (int) ($body['user_id'] ?? 0);
            if ($userId <= 0) {
                json_response(['success' => false, 'message' => 'user_id tidak valid.'], 400);
            }
            if ($userId === $user['id']) {
                json_response(['success' => false, 'message' => 'Tidak bisa approve akun sendiri.'], 400);
            }
            $stmt = $db->prepare('UPDATE users SET status = ? WHERE id = ? AND status = ?');
            $stmt->execute(['active', $userId, 'pending']);
            if ($stmt->rowCount() === 0) {
                json_response(['success' => false, 'message' => 'User tidak ditemukan atau sudah bukan status pending.'], 404);
            }
            $logger->log($user['id'], 'approve_user');
            json_response(['success' => true, 'message' => 'User berhasil di-approve.']);

        // --- Reject user pending ---
        case 'reject':
            $userId = (int) ($body['user_id'] ?? 0);
            if ($userId <= 0) {
                json_response(['success' => false, 'message' => 'user_id tidak valid.'], 400);
            }
            if ($userId === $user['id']) {
                json_response(['success' => false, 'message' => 'Tidak bisa reject akun sendiri.'], 400);
            }
            $stmt = $db->prepare('UPDATE users SET status = ? WHERE id = ? AND status = ?');
            $stmt->execute(['rejected', $userId, 'pending']);
            if ($stmt->rowCount() === 0) {
                json_response(['success' => false, 'message' => 'User tidak ditemukan atau sudah bukan status pending.'], 404);
            }
            $logger->log($user['id'], 'reject_user');
            json_response(['success' => true, 'message' => 'User berhasil ditolak.']);

        // --- Change role ---
        case 'change_role':
            $userId = (int) ($body['user_id'] ?? 0);
            $newRole = (string) ($body['role'] ?? '');
            if ($userId <= 0) {
                json_response(['success' => false, 'message' => 'user_id tidak valid.'], 400);
            }
            if (!in_array($newRole, ['student', 'teacher', 'admin'], true)) {
                json_response(['success' => false, 'message' => 'Role tidak valid. Pilih: student, teacher, atau admin.'], 400);
            }
            if ($userId === $user['id']) {
                json_response(['success' => false, 'message' => 'Tidak bisa mengubah role akun sendiri.'], 400);
            }
            $stmt = $db->prepare('UPDATE users SET role = ? WHERE id = ?');
            $stmt->execute([$newRole, $userId]);
            if ($stmt->rowCount() === 0) {
                json_response(['success' => false, 'message' => 'User tidak ditemukan.'], 404);
            }
            $logger->log($user['id'], 'change_role');
            json_response(['success' => true, 'message' => "Role berhasil diubah ke {$newRole}."]);

        // --- Delete user ---
        case 'delete':
            $userId = (int) ($body['user_id'] ?? 0);
            if ($userId <= 0) {
                json_response(['success' => false, 'message' => 'user_id tidak valid.'], 400);
            }
            if ($userId === $user['id']) {
                json_response(['success' => false, 'message' => 'Tidak bisa menghapus akun sendiri.'], 400);
            }
            $stmt = $db->prepare('SELECT id, name FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            $target = $stmt->fetch();
            if (!$target) {
                json_response(['success' => false, 'message' => 'User tidak ditemukan.'], 404);
            }
            $stmt = $db->prepare('DELETE FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            $logger->log($user['id'], 'delete_user');
            json_response(['success' => true, 'message' => "User \"{$target['name']}\" berhasil dihapus."]);

        // --- Reset password ---
        case 'reset_password':
            $userId = (int) ($body['user_id'] ?? 0);
            $newPassword = (string) ($body['new_password'] ?? '');
            if ($userId <= 0) {
                json_response(['success' => false, 'message' => 'user_id tidak valid.'], 400);
            }
            if (strlen($newPassword) < 8) {
                json_response(['success' => false, 'message' => 'Password minimal 8 karakter.'], 400);
            }
            if (strlen($newPassword) > 72) {
                json_response(['success' => false, 'message' => 'Password maksimal 72 karakter.'], 400);
            }
            $stmt = $db->prepare('SELECT id FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            if (!$stmt->fetch()) {
                json_response(['success' => false, 'message' => 'User tidak ditemukan.'], 404);
            }
            $hash = password_hash($newPassword, PASSWORD_BCRYPT);
            $stmt = $db->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
            $stmt->execute([$hash, $userId]);
            $logger->log($user['id'], 'reset_password');
            json_response(['success' => true, 'message' => 'Password berhasil di-reset.']);

        // --- Kick member from room ---
        case 'kick':
            $roomId = (int) ($body['id'] ?? 0);
            $memberUserId = (int) ($body['user_id'] ?? 0);
            if ($roomId <= 0 || $memberUserId <= 0) {
                json_response(['success' => false, 'message' => 'Parameter tidak valid.'], 400);
            }
            require_once __DIR__ . '/../logic/RuanganLogic.php';
            $logic = new RuanganLogic();
            $res = $logic->kick($user, $roomId, $memberUserId);
            if ($res['success']) {
                $logger->log($user['id'], 'kick_member');
            }
            json_response($res, $res['success'] ? 200 : 400);

        // --- Restore trashed room (soft-deleted) ---
        case 'restore':
            $roomId = (int) ($body['id'] ?? 0);
            if ($roomId <= 0) {
                json_response(['success' => false, 'message' => 'Parameter id tidak valid.'], 400);
            }
            require_once __DIR__ . '/../logic/RuanganLogic.php';
            $logic = new RuanganLogic();
            $res = $logic->restore($user, $roomId);
            if ($res['success']) {
                $logger->log($user['id'], 'restore_room');
            }
            json_response($res, $res['success'] ? 200 : 400);

        // --- Force delete trashed room (permanent) ---
        case 'force_delete':
            $roomId = (int) ($body['id'] ?? 0);
            if ($roomId <= 0) {
                json_response(['success' => false, 'message' => 'Parameter id tidak valid.'], 400);
            }
            require_once __DIR__ . '/../logic/RuanganLogic.php';
            $logic = new RuanganLogic();
            $res = $logic->forceDelete($user, $roomId);
            if ($res['success']) {
                $logger->log($user['id'], 'force_delete_room');
            }
            json_response($res, $res['success'] ? 200 : 400);

        default:
            json_response(['success' => false, 'message' => 'Aksi POST tidak dikenal.'], 400);
    }
}

json_response(['success' => false, 'message' => 'Method tidak diizinkan.'], 405);
