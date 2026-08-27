export const mockSyllabus = [
  {
    id: 'node-1',
    title: 'Keluaran & Ekspresi Sederhana',
    description: 'Struktur awal C++, cin, cout',
    prerequisites: [],
    status: 'completed',
  },
  {
    id: 'node-2',
    title: 'Variabel & Tipe Data',
    description: 'Deklarasi variabel dan memori di C++',
    prerequisites: ['node-1'],
    status: 'in-progress',
    quiz: {
      question: "Apakah keluaran dari program berikut?\n\nint x = 10;\nint y = x;\ny = 5;\ncout << x << endl;",
      options: ["5", "10", "15", "Error"],
      correctAnswer: "10",
      aiPromptContext: "Murid kemungkinan menjawab 5 karena mengira mengubah y akan mengubah x. Jelaskan konsep pass-by-value di C++ menggunakan analogi memfotokopi kertas (mengubah fotokopian tidak akan mengubah kertas asli), tanpa memberikan jawaban langsung."
    }
  },
  {
    id: 'node-3',
    title: 'Percabangan (If/Else)',
    description: 'Logika kondisional',
    prerequisites: ['node-2'],
    status: 'locked',
  }
];
