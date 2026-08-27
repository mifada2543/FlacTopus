# components/

Folder untuk komponen React yang dapat dipakai ulang di beberapa halaman.

## Rencana refactor (belum dieksekusi)

- `components/ui/` — komponen dasar: `Modal`, `Input`, `Button`
  (menggantikan inline style yang berulang di banyak halaman)
- `components/flow/` — komponen ReactFlow: `EditorNode`, `SkillNode`,
  `ZoomControls` (dipakai TeacherDashboard & StudentDashboard)
- `components/editor/` — panel editor guru: `NodeEditorPanel`,
  `EdgeEditorPanel`, `ImageUploader` (diekstrak dari TeacherDashboard)
- `components/quiz/` — `AiTutorPanel`, `FillInTheBlank`, `OptionGrid`
  (diekstrak dari Quiz)
