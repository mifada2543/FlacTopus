<?php
// ============================================================
// backend/controller/api/ruangan.php — API Ruangan
// ============================================================
// Endpoint REST untuk fitur ruangan (kelas yang dibuat guru).
//
//   GET  .../ruangan.php
//        → daftar ruangan sesuai role (otomatis membersihkan yang expired)
//
//   POST .../ruangan.php   (wajib header X-CSRF-Token)
//     { "action": "create", "nama": "Matematika 10A" }   → guru/admin
//     { "action": "join", "kode_ruangan": "TREE01" }     → murid/admin
//     { "action": "rename", "id": 3, "nama": "Baru" }   → pemilik/admin
//     { "action": "delete", "id": 3 }                    → pemilik/admin
//     { "action": "touch", "id": 3 }                     → anggota/pemilik
//
// Keamanan:
//   - Wajib login (session PHP) — require_auth_json()
//   - POST wajib CSRF token (X-CSRF-Token) — csrf_header_verify()
//   - RBAC per aksi — require_role_json()
// ============================================================

require_once __DIR__ . '/../../../auth/auth.php';
require_once __DIR__ . '/../logic/RuanganLogic.php';

// Semua operasi butuh login
$user = require_auth_json();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ------------------------------------------------------------
// GET — daftar ruangan | detail + anggota (?action=members&id=N)
//       | silabus skill tree (?action=syllabus&id=N)
// ------------------------------------------------------------
if ($method === 'GET') {
    $logic = new RuanganLogic();
    $action = $_GET['action'] ?? '';

    // Detail ruangan + daftar murid (khusus pemilik/admin — dicek di logic)
    if ($action === 'members') {
        $res = $logic->members($user, (int) ($_GET['id'] ?? 0));
        json_response($res, $res['success'] ? 200 : 400);
    }

    // Silabus / skill tree ruangan (anggota/pemilik/admin — dicek di logic)
    if ($action === 'syllabus') {
        $res = $logic->getSyllabus($user, (int) ($_GET['id'] ?? 0));
        json_response($res, $res['success'] ? 200 : 400);
    }

    json_response([
        'success'    => true,
        'ruangan'    => $logic->listForUser($user),
        'ttl_detik'  => RuanganLogic::TTL_DETIK,
    ]);
}

// ------------------------------------------------------------
// POST — aksi tulis (wajib CSRF)
// ------------------------------------------------------------
if ($method === 'POST') {
    if (!csrf_header_verify()) {
        json_response(['success' => false, 'message' => 'Sesi tidak valid.'], 403);
    }

    $body   = read_json_body();
    $action = (string) ($body['action'] ?? '');
    $logic  = new RuanganLogic();
    $res    = null;

    switch ($action) {
        case 'create':
            require_role_json([ROLE_TEACHER, ROLE_ADMIN]);
            $res = $logic->create($user, (string) ($body['nama'] ?? ''), (string) ($body['theme_color'] ?? '#0f172a'));
            break;

        case 'join':
            require_role_json([ROLE_STUDENT, ROLE_ADMIN]);
            $res = $logic->join($user, (string) ($body['kode_ruangan'] ?? ''));
            break;

        case 'delete':
            // RBAC "pemilik/admin" di cek di dalam logic (butuh tahu id ruangan)
            $res = $logic->delete($user, (int) ($body['id'] ?? 0));
            break;

        case 'rename':
            // Ubah nama ruangan dan tema — RBAC pemilik/admin di cek di dalam logic
            $res = $logic->rename($user, (int) ($body['id'] ?? 0), (string) ($body['nama'] ?? ''), (string) ($body['theme_color'] ?? '#0f172a'));
            break;

        case 'kick':
            // Keluarkan murid — RBAC pemilik/admin di cek di dalam logic
            $res = $logic->kick($user, (int) ($body['id'] ?? 0), (int) ($body['user_id'] ?? 0));
            break;

        case 'set_admin':
            // Atur role murid (member/admin)
            $res = $logic->setAdmin($user, (int) ($body['id'] ?? 0), (int) ($body['user_id'] ?? 0), (string) ($body['role'] ?? 'member'));
            break;

        case 'toggle_mark':
            $res = $logic->toggleMark($user, (int) ($body['id'] ?? 0), (int) ($body['user_id'] ?? 0));
            break;

        case 'toggle_pin':
            $res = $logic->togglePin($user, (int) ($body['id'] ?? 0), (int) ($body['user_id'] ?? 0));
            break;

        case 'heartbeat':
            // "Ada orang disini?" — dijawab browser yang terbuka di ruangan
            $res = $logic->heartbeat($user, (int) ($body['id'] ?? 0));
            break;

        case 'touch':
            $ok  = $logic->touch($user, (int) ($body['id'] ?? 0));
            $res = $ok
                ? ['success' => true, 'message' => 'Aktivitas dicatat.']
                : ['success' => false, 'message' => 'Anda bukan anggota ruangan ini.'];
            break;

        case 'reset_analytics':
            require_role_json([ROLE_TEACHER, ROLE_ADMIN]);
            $res = $logic->resetAnalytics($user, (int) ($body['id'] ?? 0));
            break;

        case 'syllabus':
            // Simpan silabus / skill tree — RBAC pemilik/admin di cek di logic
            $nodes = is_array($body['nodes'] ?? null) ? $body['nodes'] : [];
            $edges = is_array($body['edges'] ?? null) ? $body['edges'] : [];
            $res   = $logic->saveSyllabus($user, (int) ($body['id'] ?? 0), $nodes, $edges);
            break;

        default:
            json_response(['success' => false, 'message' => 'Aksi tidak dikenal.'], 400);
    }

    $status = $res['success'] ? 200 : 400;
    json_response($res, $status);
}

json_response(['success' => false, 'message' => 'Method tidak diizinkan.'], 405);
