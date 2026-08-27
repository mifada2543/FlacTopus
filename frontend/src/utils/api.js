// utils/api.js — Konstanta endpoint API PHP
// import.meta.env.BASE_URL berasal dari vite.config.js (base: '/FlacTopus/'),
// sehingga fetch selalu menuju path yang benar meski dibuka dari route dalam
// (mis. /FlacTopus/quiz/...).
export const AUTH_API = `${import.meta.env.BASE_URL}auth`;
// API ruangan (PHP) — folder backend/controller/api terbuka untuk web
// (lihat backend/.htaccess: hanya folder api/ yang boleh diakses).
export const RUANGAN_API = `${import.meta.env.BASE_URL}backend/controller/api`;
export const QUIZ_API = `${RUANGAN_API}/quiz.php`;

// Helper GET ke API ruangan (daftar, members, syllabus, ...).
// Otomatis melempar Error berisi pesan dari server jika gagal.
export const ruanganGet = async (action = '', params = {}) => {
  const qs = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${RUANGAN_API}/ruangan.php?${qs}`, { credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Gagal memuat data dari server.');
  }
  return data;
};

// Helper POST ke API ruangan (create, join, syllabus, ...). Wajib CSRF.
export const ruanganPost = async (csrfToken, payload) => {
  const res = await fetch(`${RUANGAN_API}/ruangan.php`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Terjadi kesalahan pada server.');
  }
  return data;
};

// Helper GET ke API kuis (analytics, student_progress).
export const quizGet = async (action, params = {}) => {
  const qs = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${QUIZ_API}?${qs}`, { credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Gagal memuat data kuis.');
  }
  return data;
};

// Helper POST ke API kuis (submit jawaban). Wajib CSRF.
export const quizPost = async (csrfToken, payload) => {
  const res = await fetch(QUIZ_API, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Gagal menyimpan jawaban kuis.');
  }
  return data;
};
