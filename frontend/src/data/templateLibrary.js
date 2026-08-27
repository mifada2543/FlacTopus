export const templates = [
  {
    id: 'tpl-linear',
    name: 'Alur Linear (Dasar)',
    description: 'Cocok untuk materi yang berurutan secara bertahap satu per satu.',
    iconType: 'linear',
    image: '/FlacTopus/preview-linear.png',
    nodes: [
      { id: 'n1', title: 'Materi Pembuka', type: 'materi' },
      { id: 'n2', title: 'Latihan Soal', type: 'kuis' },
      { id: 'n3', title: 'Materi Lanjutan', type: 'materi' },
      { id: 'n4', title: 'Kuis Evaluasi', type: 'kuis' }
    ],
    edges: [
      { source: 'n1', target: 'n2' },
      { source: 'n2', target: 'n3' },
      { source: 'n3', target: 'n4' }
    ],
    layout: [
      { id: 'n1', x: 250, y: 0 },
      { id: 'n2', x: 250, y: 150 },
      { id: 'n3', x: 250, y: 300 },
      { id: 'n4', x: 250, y: 450 }
    ]
  },
  {
    id: 'tpl-branching',
    name: 'Alur Bercabang (Pengayaan)',
    description: 'Satu materi dasar yang bercabang ke dua tes dengan tingkat kesulitan berbeda.',
    iconType: 'branching',
    image: '/FlacTopus/preview-branching.png',
    nodes: [
      { id: 'n1', title: 'Materi Konsep Dasar', type: 'materi' },
      { id: 'n2', title: 'Jalur Pengayaan (Sulit)', type: 'kuis' },
      { id: 'n3', title: 'Jalur Remedial (Mudah)', type: 'kuis' }
    ],
    edges: [
      { source: 'n1', target: 'n2' },
      { source: 'n1', target: 'n3' }
    ],
    layout: [
      { id: 'n1', x: 250, y: 0 },
      { id: 'n2', x: 100, y: 150 },
      { id: 'n3', x: 400, y: 150 }
    ]
  },
  {
    id: 'tpl-boss',
    name: 'Ujian Akhir (Boss Fight)',
    description: 'Dua materi terpisah yang harus diselesaikan untuk membuka satu Ujian Akhir besar.',
    iconType: 'boss',
    image: '/FlacTopus/preview-boss.png',
    nodes: [
      { id: 'n1', title: 'Materi Cabang A', type: 'materi' },
      { id: 'n2', title: 'Materi Cabang B', type: 'materi' },
      { id: 'n3', title: 'Ujian Final Boss', type: 'kuis' }
    ],
    edges: [
      { source: 'n1', target: 'n3' },
      { source: 'n2', target: 'n3' }
    ],
    layout: [
      { id: 'n1', x: 100, y: 0 },
      { id: 'n2', x: 400, y: 0 },
      { id: 'n3', x: 250, y: 150 }
    ]
  }
];
