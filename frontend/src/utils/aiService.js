// ============================================================
// utils/aiService.js — AI Service (via backend proxy)
// ============================================================
// SEMUA request ke Gemini API diproxy lewat backend PHP.
// API key TIDAK PERNAH dikirim ke frontend.
//
// Endpoint: backend/controller/api/gemini.php
// ============================================================

import { RUANGAN_API } from './api';

const GEMINI_API = `${RUANGAN_API}/gemini.php`;

/**
 * Helper POST ke Gemini backend proxy.
 * CSRF token diambil dari session (sudah di-handle oleh useAuth).
 */
async function geminiPost(csrfToken, payload) {
  const res = await fetch(GEMINI_API, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Gagal menghubungi AI.');
  }
  return data.data;
}

// ================================================================
// Public API
// ================================================================

/**
 * Socratic Feedback — bimbing murid tanpa kasih jawaban langsung.
 * @param {string} question    - Pertanyaan kuis
 * @param {string} studentAnswer - Jawaban murid (yang salah)
 * @param {string} aiContext   - Instruksi dari guru
 * @param {string} csrfToken   - CSRF token
 * @returns {Promise<string>} Respons Socratic
 */
export const getSocraticFeedback = async (question, studentAnswer, aiContext, csrfToken) => {
  if (!csrfToken) return '?? (Session belum siap — muat ulang halaman)';

  try {
    const result = await geminiPost(csrfToken, {
      action: 'socratic_feedback',
      question,
      answer: studentAnswer,
      context: aiContext,
    });
    return result;
  } catch (error) {
    console.error('Gagal menghubungi AI:', error);
    return 'Maaf, otak AI-nya lagi pusing. Coba lagi nanti ya!';
  }
};

/**
 * Generate Skill Tree — buat silabus dari topik atau PDF.
 * @param {string} inputData - Topik materi atau teks PDF
 * @param {boolean} isPdf    - Apakah input dari PDF
 * @param {string} csrfToken - CSRF token
 * @returns {Promise<object>} Data nodes & edges
 */
export const generateSkillTree = async (inputData, isPdf = false, csrfToken) => {
  if (!csrfToken) throw new Error('Session belum siap — muat ulang halaman');

  try {
    const result = await geminiPost(csrfToken, {
      action: 'generate_skill_tree',
      input: inputData,
      is_pdf: isPdf,
    });
    return result;
  } catch (error) {
    console.error('Gagal generate skill tree:', error);
    const errMsg = error.message?.toLowerCase() || '';
    if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('limit')) {
      throw new Error('Limit API Gemini tercapai! Tunggu sebentar (kurang lebih 1 menit).');
    }
    throw error;
  }
};

/**
 * Chat dengan Asisten Guru — multi-turn chat dengan analytics context.
 * @param {Array} messages - [{ role: 'user'|'model', content: '...' }]
 * @param {string} analyticsContext - Data analitik kelas
 * @param {string} csrfToken - CSRF token
 * @returns {Promise<string>} Respons AI
 */
export const chatWithTeacherAssistant = async (messages, analyticsContext, csrfToken) => {
  if (!csrfToken) throw new Error('Session belum siap — muat ulang halaman');

  try {
    const result = await geminiPost(csrfToken, {
      action: 'chat_teacher',
      messages,
      analytics_context: analyticsContext,
    });
    return result;
  } catch (error) {
    console.error('Gagal chat dengan AI:', error);
    throw new Error('Maaf, asisten AI sedang gangguan: ' + error.message);
  }
};

/**
 * Chat dengan Asisten Murid — multi-turn chat dengan konteks materi/kuis.
 * @param {Array} messages - [{ role: 'user'|'model', content: '...' }]
 * @param {string} contextStr - Konteks materi atau kuis
 * @param {string} studentName - Nama murid
 * @param {string} csrfToken - CSRF token
 * @returns {Promise<string>} Respons AI
 */
export const chatWithStudentAssistant = async (messages, contextStr, studentName, csrfToken) => {
  if (!csrfToken) throw new Error('Session belum siap — muat ulang halaman');

  try {
    const result = await geminiPost(csrfToken, {
      action: 'chat_student',
      messages,
      context: contextStr,
      student_name: studentName,
    });
    return result;
  } catch (error) {
    console.error('Gagal chat dengan AI:', error);
    throw new Error('Maaf, asisten AI sedang gangguan: ' + error.message);
  }
};
