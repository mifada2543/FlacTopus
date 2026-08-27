# hooks/

Folder untuk custom React hooks (logika state yang dipakai ulang).

## Rencana refactor (belum dieksekusi)

- `useSkillTree` — state nodes/edges + operasi update item/quiz untuk
  TeacherDashboard (menggantikan 8 fungsi update yang hampir identik)
- `useQuiz` — mesin state kuis (`neutral` / `wrong` / `correct`) + panggilan
  Socratic AI tutor (diekstrak dari Quiz)
- `useAuth` — sesi user (`currentUser` di localStorage) + login/logout
