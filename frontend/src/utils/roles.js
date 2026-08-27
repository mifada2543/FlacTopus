// utils/roles.js — RBAC: definisi role & helper izin akses
//
// 'guest' bukan akun di database; guest = pengguna yang belum login.
// Ia menjadi role awal setiap orang yang pertama kali membuka aplikasi
// (hanya bisa melihat landing, login, dan register).

export const ROLE = {
  GUEST: 'guest',
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
};

/** Benar jika role ada di daftar role yang diizinkan (mis. [ROLE.TEACHER, ROLE.ADMIN]). */
export const isAllowed = (role, allowedRoles) => allowedRoles.includes(role);
