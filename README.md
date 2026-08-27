OIT DAP, DAH KELAR NIH BAGIAN GW. (KEKNYA)

## 📂 Struktur Project

```text
FlacTopus/
├── frontend/                 # Aplikasi React (Vite) - Frontend interaktif
│   ├── public/               # Aset publik statis (favicon, Rive animasi)
│   ├── src/
│   │   ├── components/       # Komponen UI React yang dapat digunakan ulang
│   │   ├── data/             # Data bawaan (template silabus)
│   │   ├── hooks/            # Custom React hooks (autentikasi dll)
│   │   ├── pages/            # Halaman utama (Landing, Dashboard, Kuis)
│   │   ├── utils/            # Script pembantu (Koneksi AI Gemini, API handler)
│   │   ├── App.jsx           # Rute utama aplikasi
│   │   └── main.jsx          # Titik masuk React
│   ├── index.html            # Kerangka dasar HTML SPA
│   └── vite.config.js        # Konfigurasi bundler Vite
├── backend/                  # PHP API murni
│   └── controller/           
│       ├── api/              # Endpoint API (kuis, ruangan, chat)
│       └── logic/            # Logika backend utama (LoginRegister, RuanganLogic)
├── auth/                     # Endpoint khusus autentikasi (login, register, session)
├── db/                       # Dokumentasi skema dan migrasi database MySQL
├── storage/                  # Folder penyimpanan internal server
│   └── ruangan/              # Menyimpan file .json silabus per kelas
└── README.md                 # Dokumentasi project ini
```

---

## Apa Aja yang Baru?

perubahan dibagi menjadi **Garis Besar (Utama)** dan **Fitur Rinci (Lanjutan)**.

### 📌 Perubahan Utama (Garis Besar)

1. **Arsitektur Modern (React SPA + PHP API):** Kita sepenuhnya meninggalkan cara lama (PHP yang merender HTML/htmx). Sekarang aplikasi berjalan sebagai **Single Page Application (SPA)** menggunakan React (Vite) di *frontend*, sementara PHP murni bertugas sebagai penyedia JSON API di *backend*.
2. **Visual Skill Tree (React Flow):** Manajemen kurikulum tidak lagi berbentuk tabel kaku. Guru merakit rute materi (Silabus) menggunakan *Visual Builder* berbasis *drag-and-drop*. Murid melihat rute ini sebagai Peta Belajar interaktif (dengan indikator visual untuk materi yang terkunci/terbuka).
3. **FlacTopus AI (Dua Sisi):** Integrasi AI Gemini kini melayani dua pihak. Di sisi Guru, AI adalah asisten pintar untuk *Auto-generate* materi. Di sisi Murid, AI bertindak sebagai *Socratic Tutor* yang membimbing, bukan memberi jawaban instan.
4. **Gamifikasi & Boss Fight Mode:** Kuis kini memiliki mode *Boss Fight* bergaya RPG lengkap dengan Health Point (HP), efek visual, dan transisi sinematik, membuat ujian terasa seperti bermain *game*.

### 🔍 Fitur Rinci & Peningkatan Sistem (Lanjutan)

Bagian ini mencakup perombakan besar-besaran dan detail fitur yang telah kita bangun dari awal hingga akhir:

*   **Ekosistem AI Assistant yang Kokoh:**
    *   **Teacher AI (Asisten Guru):** Mampu meng-generate kurikulum / silabus utuh hanya dari sebuah *prompt* (teks instruksi). AI secara otomatis menyusun materi, kuis, dan menghubungkannya dalam Visual Builder. Output AI mendukung *Markdown* secara penuh (termasuk *code block*).
    *   **Student AI (Asisten Murid):** Terintegrasi di dalam kuis sebagai teman diskusi. Dilengkapi dengan **Prompt Injection Protection** untuk mencegah murid "menipu" AI agar memberikan bocoran soal, menanyakan resep makanan, atau mengeksploitasi sistem.
*   **Audio & Sound Effect (SFX) Imersif:**
    *   **Boss BGM:** Musik latar yang *epic* khusus saat murid memasuki mode *Boss Fight*.
    *   **Retro SFX Real-time:** Suara *bloop*, *hit*, dan *error* bergaya retro 8-bit yang dihasilkan secara dinamis menggunakan *Web Audio API* saat murid memilih opsi jawaban kuis.
    *   **UI SFX:** Efek suara angin (*swoosh*) saat melakukan *zoom-in* atau berpindah dari menu Analitik ke area Visual Builder.
*   **Perombakan Total Tipe Kuis:**
    *   **Boss Fight:** Pertarungan RPG! Memiliki indikator *HP Boss* dan *HP Murid*. Jawaban benar akan mengurangi darah Boss (dengan efek layar bergetar), jawaban salah mengurangi darah murid.
    *   **Isi Rumpang (*Fill in the Blank*):** Mode menyusun kalimat interaktif (teks rumpang).
    *   **Auditori:** Kuis berbasis pendengaran di mana murid harus menebak berdasarkan *sound* yang diputar (dilengkapi visual *waveform* interaktif).
    *   **Ice Breaking:** Mode istirahat di tengah *Skill Tree*. Murid sekadar bermain tebak suara emoji/maskot ditemani alunan musik *lo-fi* (musik otomatis *fade-out* saat sesi selesai).
*   **Manajemen Ruangan Kelas yang Fleksibel:**
    *   **Ketua Kelas (Role Admin):** Guru kini bisa mengangkat/memilih salah satu murid untuk menjadi "Ketua Kelas" (Sub-Role Admin) yang bisa membantu mengelola kelas.
    *   **Personalisasi & Pin:** Fitur menge-Pin (menyematkan) kelas favorit, memberikan *Mark* (tanda khusus), serta kebebasan mengubah tema warna (*Theme Color*) pada setiap kelas agar lebih unik.
*   **Visual Builder (Skill Tree) Lanjutan:**
    *   **Undo & Redo:** Keamanan penuh saat mengedit kurikulum. Guru bisa menekan tombol *Undo/Redo* untuk membatalkan perubahan node/garis.
    *   **Syllabus Explorer:** Modal eksplorasi interaktif dari menu Analitik yang memungkinkan Guru melakukan *Zoom & Edit* langsung ke node (materi) spesifik di Visual Builder.
*   **Class Analytics & Anti-Cheat (Dashboard Guru):** 
    *   Dashboard analitik canggih yang secara cerdas **mengecualikan** data dari aktivitas non-akademik (seperti *Ice Breaking*) agar grafik nilai kelas dan "Materi Tersulit" (*Hardest Nodes*) tetap akurat.
    *   Sistem **Deteksi Nyotek (Anti-Cheat)** yang otomatis merekam dan melaporkan ke guru jika murid terdeteksi berpindah *tab* atau keluar dari aplikasi saat kuis berlangsung.
*   **Pembaruan Library & Clean Code:** 
    *   Membuang library usang yang berat (`tsParticles`, `htmx`, `Bootstrap`) dan beralih ke ekosistem *modern-lightweight* (`canvas-confetti` untuk animasi selebrasi, `framer-motion` untuk transisi UI).
    *   Seluruh file *testing*, skrip *debugging* sisa, dan *comment* bawaan AI yang "puitis" telah **dihapus total**. Kode murni profesional dan mudah dibaca.
    *   Menerapkan *UNIQUE constraint* di sisi *database* (`quiz_attempts`) untuk menangkal eksploitasi nilai (*spam submit*) dari pihak murid.


  
Dan masih banyak lagi, nanti lu tanya aja seputar fiturnya.



---

## 🗄️ Arsitektur Database & Penyimpanan

Sistem kita memadukan kecepatan **MySQL** dan fleksibilitas **JSON**.

*   **MySQL (`project_lomba`)**: 
    *   `users`: Menyimpan data akun inti.
    *   `ruangan`: Entitas kelas virtual (punya kode unik 6 karakter, tema warna).
    *   `class_members`: Relasi murid dan ruangan (punya *role* khusus seperti `admin` untuk Ketua Kelas).
    *   `quiz_attempts`: Menyimpan nilai murid. **Penting:** Ada *UNIQUE constraint* (`ruangan_id`, `user_id`, `node_id`) sebagai proteksi Anti-Spam (satu murid cuma bisa *submit* satu nilai valid per soal).
*   **JSON (`storage/ruangan/` atau `ruang/`)**:
    *   Kita **TIDAK** menyimpan struktur *Skill Tree* / Silabus di SQL karena strukturnya (*nodes & edges*) terlalu rumit untuk tabel relasional. 
    *   Sebagai gantinya, silabus disimpan utuh sebagai file `.json`. *Database* hanya menyimpan ID/pointer ke file tersebut. Jauh lebih cepat dan gampang di-*parse* oleh React Flow!

---

## Role Based Access Control (RBAC)

Akses diproteksi ketat baik di level UI (React Router) maupun di level API (PHP Session).

| Role (User) | Hak Akses |
| :--- | :--- |
| **Guest** | Cuma bisa akses Landing Page, Login, dan Register. |
| **Student (Murid)** | Bisa join ruangan pakai kode, buka *Skill Tree*, ngerjain kuis, dan chat AI. |
| **Teacher (Guru)** | Mengelola kelas, akses *Visual Builder*, mantau *Class Analytics*. |
| **Admin (Kepsek)** | Akses tak terbatas ke seluruh sistem (dibuat manual via `schema.sql`). |

*(Di dalam tabel `class_members` juga ada sub-role **Ketua Kelas / Admin Ruangan** buat ngebantu Guru ngelola kelas).*

---

## Cara Menjalankan

### Langkah 1: Persiapan Database
1. Buka XAMPP, nyalakan **Apache** dan **MySQL**.
2. Buka phpMyAdmin, buat *database* baru (atau langsung *Import* file `db/schema.sql`).
3. Pastikan folder *project* ini ada di `htdocs/FlacTopus`.

### Langkah 2: Setup API Key AI
1. Masuk ke folder `frontend/`.
2. *Copy* file `.env.example` menjadi `.env`.
3. Isi `VITE_GEMINI_API_KEY` dengan API Key dari Google AI Studio.

### Langkah 3: Build Frontend (Cukup Sekali!)
Karena lu mungkin lebih suka langsung ngetes di `http://localhost/FlacTopus/` tanpa harus jalanin `npm run dev` terus-terusan, lu cuma butuh nge-*build* React-nya sekali:

```bash
cd frontend
npm install
npm run build
```

Hasil *build* (file statis `.js` & `.css` serta `index.html`) akan otomatis diproduksi dan diatur oleh Vite. Kalau sudah di-*build*, lu bisa langsung buka browser:
👉 **`http://localhost/FlacTopus/`** 

*(Opsi Dev: Kalau mau ngoding UI dan butuh Hot-Reload, baru lu pakai `npm run dev` di folder `frontend`).*

---