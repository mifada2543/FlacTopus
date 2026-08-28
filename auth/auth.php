<?php
// ============================================================
// auth/auth.php — Helper pengaman halaman (session guard)
// ============================================================
// Dipakai oleh halaman PHP agar tidak menulis cek session berulang-ulang.
//
//   require_auth()   : wajib login — jika belum, redirect ke login.php
//   require_guest()  : halaman khusus tamu (login/register) — jika sudah
//                      login, langsung lanjut ke aplikasi
// ============================================================

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../backend/controller/logic/LoginRegisterLogic.php';

/**
 * Wajib login. Redirect ke halaman login bila session kosong.
 *
 * @return array{id:int,name:string,email:string,role:string} data user session
 */
function require_auth(): array
{
    start_session();
    if (empty($_SESSION['user'])) {
        redirect('/auth/login.php');
    }
    return $_SESSION['user'];
}

/**
 * Halaman khusus tamu (mis. login/register). Jika sudah login, lanjut ke aplikasi.
 */
function require_guest(): void
{
    start_session();
    if (!empty($_SESSION['user'])) {
        $role = $_SESSION['user']['role'] ?? '';
        if ($role === 'admin') {
            redirect('/admin');
        } elseif ($role === 'teacher') {
            redirect(REDIRECT_TEACHER);
        } else {
            redirect(REDIRECT_STUDENT);
        }
    }
}

/**
 * Wajib login — versi API JSON. Jika belum login, balas 401 + JSON.
 * (Dipakai endpoint API yang dilindungi, mis. nilai-input.php)
 *
 * @return array{id:int,name:string,email:string,role:string}
 */
function require_auth_json(): array
{
    start_session();
    if (empty($_SESSION['user'])) {
        json_response(['success' => false, 'message' => 'Anda harus login.'], 401);
    }

    // --- Session Hijacking Detection ---
    // Cek apakah session_id saat ini cocok dengan yang tersimpan di DB.
    // Jika tidak cocok, session mungkin dicuri → hancurkan.
    $user = $_SESSION['user'];
    $currentSid = session_id();
    if (!empty($user['id']) && !empty($_SESSION['last_session_id'])) {
        if ($_SESSION['last_session_id'] !== $currentSid) {
            // Session tidak cocok → kemungkinan session hijacking
            $_SESSION = [];
            session_destroy();
            json_response([
                'success' => false,
                'message' => 'Sesi telah dialihkan karena aktivitas mencurigakan. Silakan login ulang.',
            ], 401);
        }
    }

    return $user;
}

// ------------------------------------------------------------
// RBAC — role & otorisasi
// ------------------------------------------------------------
// 'guest' bukan role di database; guest = belum login (session kosong).
const ROLE_STUDENT = 'student';
const ROLE_TEACHER = 'teacher';
const ROLE_ADMIN   = 'admin';

/** Cek apakah user punya salah satu role yang diizinkan. */
function has_role(array $user, array $roles): bool
{
    return in_array($user['role'] ?? '', $roles, true);
}

/**
 * Wajib login + role tertentu (RBAC). Jika tidak berhak, balas 403 + JSON.
 *
 * @param array $roles daftar role yang diizinkan (mis. [ROLE_ADMIN])
 * @return array data user yang sudah terautentikasi
 */
function require_role_json(array $roles): array
{
    $user = require_auth_json();
    if (!has_role($user, $roles)) {
        json_response(['success' => false, 'message' => 'Akses ditolak: role tidak diizinkan.'], 403);
    }
    return $user;
}
