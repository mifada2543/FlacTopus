<?php
// ============================================================
// auth/session.php — Kontrol akses: status login + token CSRF
// ============================================================
// Dipanggil oleh React (hooks/useAuth.js) untuk:
//   1. Mengecek apakah pengguna sudah login (session PHP).
//   2. Mengambil token CSRF untuk request berikutnya.
//
//   GET /FlacTopus/auth/session.php
//
// Respons: 200 {
//   logged_in: bool,
//   user: {id,name,email,role} | null,
//   csrf_token: string
// }
// ============================================================

require_once __DIR__ . '/auth.php';

$loggedIn = false;
$user     = null;

start_session();

if (!empty($_SESSION['user'])) {
    try {
        $stmt = db()->prepare('SELECT id, name, email, role FROM users WHERE id = ?');
        $stmt->execute([$_SESSION['user']['id']]);
        $row = $stmt->fetch();

        if ($row) {
            $loggedIn = true;
            $user = [
                'id'    => (int) $row['id'],
                'name'  => $row['name'],
                'email' => $row['email'],
                'role'  => $row['role'],
            ];
            $_SESSION['user'] = $user; // sinkronkan data terbaru
        } else {
            unset($_SESSION['user']); // user sudah dihapus dari DB
        }
    } catch (PDOException $e) {
        // DB bermasalah — anggap belum login (aman)
        $loggedIn = false;
    }
}

json_response([
    'logged_in'  => $loggedIn,
    'user'       => $user,
    'csrf_token' => csrf_token(),
]);
