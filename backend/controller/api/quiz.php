<?php
// ============================================================
// backend/controller/api/quiz.php — API Kuis (rekam jawaban murid)
// ============================================================
// Endpoint:
//   POST .../quiz.php  (wajib header X-CSRF-Token)
//     { "action": "submit",
//       "ruangan_id": 1,
//       "node_id": "node-1",
//       "node_label": "Variabel C++",
//       "score": 75,
//       "total_questions": 4,
//       "correct_answers": 3,
//       "wrong_answers": ["Apa itu pointer?"]
//     }
//
//   GET .../quiz.php?action=analytics&ruangan_id=1
//     → Rangkuman kelas: rata-rata, soal tersulit, leaderboard
//       (hanya guru pembuat ruangan)
//
//   GET .../quiz.php?action=student_progress&ruangan_id=1
//     → Progress murid yang sedang login di ruangan tsb
// ============================================================

require_once __DIR__ . '/../../../auth/auth.php';

$user   = require_auth_json();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db     = db();

// -------------------------------------------------------
// GET — analytics / student progress
// -------------------------------------------------------
if ($method === 'GET') {
    $action     = $_GET['action'] ?? '';
    $ruanganId  = (int) ($_GET['ruangan_id'] ?? 0);

    if (!$ruanganId) {
        json_response(['success' => false, 'message' => 'ruangan_id wajib diisi.'], 400);
    }

        if ($action === 'analytics') {
        // Pastikan user adalah pemilik ruangan atau ketua kelas
        $stmt = $db->prepare('SELECT user_id FROM ruangan WHERE id = ?');
        $stmt->execute([$ruanganId]);
        $room = $stmt->fetch();
        $isOwner = $room && (int) $room['user_id'] === (int) $user['id'];
        
        $isKetua = false;
        if (!$isOwner) {
            $stmtRole = $db->prepare("SELECT role FROM class_members WHERE ruangan_id = ? AND user_id = ?");
            $stmtRole->execute([$ruanganId, (int) $user['id']]);
            $member = $stmtRole->fetch();
            $isKetua = $member && $member['role'] === 'admin';
        }

        if (!$isOwner && !$isKetua && $user['role'] !== 'admin') {
            json_response(['success' => false, 'message' => 'Hanya guru, ketua kelas, atau admin yang bisa melihat analytics.'], 403);
        }

        // 1) Ringkasan: rata-rata nilai, total attempt, total murid unik (hanya murid yang MASIH di kelas)
        $stmt = $db->prepare(
            'SELECT COUNT(qa.id) AS total_attempts,
                    COUNT(DISTINCT qa.user_id) AS total_students,
                    ROUND(AVG(qa.score), 1) AS avg_score
             FROM quiz_attempts qa
             INNER JOIN class_members cm ON cm.user_id = qa.user_id AND cm.ruangan_id = qa.ruangan_id
             WHERE qa.ruangan_id = ?'
        );
        $stmt->execute([$ruanganId]);
        $summary = $stmt->fetch();

        // 2) Soal tersulit: node yang rata-rata nilainya paling rendah (hanya murid yang MASIH di kelas)
        $stmt = $db->prepare(
            'SELECT qa.node_id, qa.node_label,
                    COUNT(qa.id) AS attempts,
                    ROUND(AVG(qa.score), 1) AS avg_score
             FROM quiz_attempts qa
             INNER JOIN class_members cm ON cm.user_id = qa.user_id AND cm.ruangan_id = qa.ruangan_id
             WHERE qa.ruangan_id = ?
             GROUP BY qa.node_id, qa.node_label
             ORDER BY avg_score ASC
             LIMIT 5'
        );
        $stmt->execute([$ruanganId]);
        $hardest = $stmt->fetchAll();

        // 3) Leaderboard: rata-rata nilai per murid (tertinggi ke terendah) (hanya murid yang MASIH di kelas)
        $stmt = $db->prepare(
            'SELECT qa.user_id, u.name,
                    SUM(qa.total_questions) AS quizzes_done,
                    ROUND(AVG(qa.score), 1) AS avg_score
             FROM quiz_attempts qa
             JOIN users u ON u.id = qa.user_id
             INNER JOIN class_members cm ON cm.user_id = qa.user_id AND cm.ruangan_id = qa.ruangan_id
             WHERE qa.ruangan_id = ?
             GROUP BY qa.user_id, u.name
             ORDER BY avg_score DESC'
        );
        $stmt->execute([$ruanganId]);
        $leaderboard = $stmt->fetchAll();

        // 4) Soal yang paling sering dijawab salah (dari kolom wrong_answers) (hanya murid yang MASIH di kelas)
        $stmt = $db->prepare(
            'SELECT qa.wrong_answers FROM quiz_attempts qa
             INNER JOIN class_members cm ON cm.user_id = qa.user_id AND cm.ruangan_id = qa.ruangan_id
             WHERE qa.ruangan_id = ? AND qa.wrong_answers IS NOT NULL AND qa.wrong_answers != ""'
        );
        $stmt->execute([$ruanganId]);
        $wrongMap = [];
        foreach ($stmt->fetchAll() as $row) {
            $arr = json_decode($row['wrong_answers'], true);
            if (is_array($arr)) {
                $uniqueQuestions = [];
                foreach ($arr as $item) {
                    $q = is_string($item) ? $item : ($item['question'] ?? null);
                    if ($q && !in_array($q, $uniqueQuestions)) {
                        $uniqueQuestions[] = $q;
                    }
                }
                foreach ($uniqueQuestions as $q) {
                    $wrongMap[$q] = ($wrongMap[$q] ?? 0) + 1;
                }
            }
        }
        arsort($wrongMap);
        $frequentWrong = [];
        $i = 0;
        foreach ($wrongMap as $question => $count) {
            $frequentWrong[] = ['question' => $question, 'wrong_count' => $count];
            if (++$i >= 5) break;
        }

        // 5) Total murid terdaftar di kelas
        $stmt = $db->prepare('SELECT COUNT(*) FROM class_members WHERE ruangan_id = ?');
        $stmt->execute([$ruanganId]);
        $totalMembers = (int) $stmt->fetchColumn();

        json_response([
            'success'        => true,
            'summary'        => [
                'total_attempts' => (int) $summary['total_attempts'],
                'total_students_attempted' => (int) $summary['total_students'],
                'total_members'  => $totalMembers,
                'avg_score'      => (float) ($summary['avg_score'] ?? 0),
            ],
            'hardest_nodes'  => $hardest,
            'leaderboard'    => $leaderboard,
            'frequent_wrong' => $frequentWrong,
        ]);
    }

    // === ANALYTICS TREND (Grafik Garis Rata-Rata Nilai) ===
    if ($action === 'analytics_trend') {
        // Cek auth
        $stmt = $db->prepare('SELECT user_id FROM ruangan WHERE id = ?');
        $stmt->execute([$ruanganId]);
        $room = $stmt->fetch();
        $isOwner = $room && (int) $room['user_id'] === (int) $user['id'];
        
        $isKetua = false;
        if (!$isOwner) {
            $stmtRole = $db->prepare("SELECT role FROM class_members WHERE ruangan_id = ? AND user_id = ?");
            $stmtRole->execute([$ruanganId, (int) $user['id']]);
            $member = $stmtRole->fetch();
            $isKetua = $member && $member['role'] === 'admin';
        }

        if (!$isOwner && !$isKetua && $user['role'] !== 'admin') {
            json_response(['success' => false, 'message' => 'Hanya guru, ketua kelas, atau admin yang bisa melihat trend analytics.'], 403);
        }

        $stmt = $db->prepare(
            'SELECT node_id, node_label AS name, ROUND(AVG(score), 1) AS avg_score, COUNT(id) AS attempts
             FROM quiz_attempts
             WHERE ruangan_id = ?
             GROUP BY node_id, node_label
             ORDER BY MIN(created_at) ASC'
        );
        $stmt->execute([$ruanganId]);
        $trend = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Pastikan tipe data numeric aman
        foreach ($trend as &$item) {
            $item['avg_score'] = (float) $item['avg_score'];
            $item['attempts'] = (int) $item['attempts'];
        }

        json_response([
            'success' => true,
            'trend'   => $trend,
        ]);
    }

    // === ANALYTICS PARTICIPATION (Grafik Donut & Wall of Shame) ===
    if ($action === 'analytics_participation') {
        // Cek auth
        $stmt = $db->prepare('SELECT user_id FROM ruangan WHERE id = ?');
        $stmt->execute([$ruanganId]);
        $room = $stmt->fetch();
        $isOwner = $room && (int) $room['user_id'] === (int) $user['id'];
        
        $isKetua = false;
        if (!$isOwner) {
            $stmtRole = $db->prepare("SELECT role FROM class_members WHERE ruangan_id = ? AND user_id = ?");
            $stmtRole->execute([$ruanganId, (int) $user['id']]);
            $member = $stmtRole->fetch();
            $isKetua = $member && $member['role'] === 'admin';
        }

        if (!$isOwner && !$isKetua && $user['role'] !== 'admin') {
            json_response(['success' => false, 'message' => 'Hanya guru, ketua kelas, atau admin yang bisa melihat analytics partisipasi.'], 403);
        }

        // 1. Get all students in the class
        $stmt = $db->prepare("SELECT u.id, u.name, u.email FROM class_members cm JOIN users u ON cm.user_id = u.id WHERE cm.ruangan_id = ? AND u.role != 'teacher'");
        $stmt->execute([$ruanganId]);
        $allStudents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 2. Get students who have attempted at least one quiz
        $stmt2 = $db->prepare("SELECT DISTINCT user_id FROM quiz_attempts WHERE ruangan_id = ?");
        $stmt2->execute([$ruanganId]);
        $activeUserIds = $stmt2->fetchAll(PDO::FETCH_COLUMN);

        $activeStudents = [];
        $passiveStudents = [];

        foreach ($allStudents as $student) {
            if (in_array($student['id'], $activeUserIds)) {
                $activeStudents[] = $student;
            } else {
                $passiveStudents[] = $student;
            }
        }

        json_response([
            'success' => true,
            'active_count' => count($activeStudents),
            'passive_count' => count($passiveStudents),
            'passive_students' => $passiveStudents
        ]);
    }

    // === ANALYTICS LEADERBOARD ===
    if ($action === 'analytics_leaderboard') {
        // Cek auth
        $stmt = $db->prepare('SELECT user_id FROM ruangan WHERE id = ?');
        $stmt->execute([$ruanganId]);
        $room = $stmt->fetch();
        $isOwner = $room && (int) $room['user_id'] === (int) $user['id'];
        
        $isKetua = false;
        if (!$isOwner) {
            $stmtRole = $db->prepare("SELECT role FROM class_members WHERE ruangan_id = ? AND user_id = ?");
            $stmtRole->execute([$ruanganId, (int) $user['id']]);
            $member = $stmtRole->fetch();
            $isKetua = $member && $member['role'] === 'admin';
        }

        if (!$isOwner && !$isKetua && $user['role'] !== 'admin') {
            json_response(['success' => false, 'message' => 'Hanya guru, ketua kelas, atau admin yang bisa melihat leaderboard.'], 403);
        }

        $stmt = $db->prepare("
            SELECT u.id, u.name, u.email, 
                   COUNT(qa.id) as quizzes_taken, 
                   COALESCE(ROUND(AVG(qa.score), 1), 0) as avg_score 
            FROM class_members cm 
            JOIN users u ON cm.user_id = u.id 
            LEFT JOIN quiz_attempts qa ON u.id = qa.user_id AND qa.ruangan_id = cm.ruangan_id
            WHERE cm.ruangan_id = ? AND u.role != 'teacher'
            GROUP BY u.id, u.name, u.email
            ORDER BY avg_score DESC, quizzes_taken DESC
        ");
        $stmt->execute([$ruanganId]);
        $leaderboard = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Convert numeric values to proper types
        foreach ($leaderboard as &$user) {
            $user['quizzes_taken'] = (int) $user['quizzes_taken'];
            $user['avg_score'] = (float) $user['avg_score'];
        }

        json_response([
            'success' => true,
            'leaderboard' => $leaderboard
        ]);
    }

    // === ANALYTICS MISTAKES (Soal Sering Salah) ===
    if ($action === 'analytics_mistakes') {
        $stmt = $db->prepare('SELECT user_id FROM ruangan WHERE id = ?');
        $stmt->execute([$ruanganId]);
        $room = $stmt->fetch();
        
        $stmt = $db->prepare('SELECT role FROM class_members WHERE ruangan_id = ? AND user_id = ?');
        $stmt->execute([$ruanganId, (int) $user['id']]);
        $member = $stmt->fetch();
        
        $isOwner = $room && (int) $room['user_id'] === (int) $user['id'];
        $isKetua = $member && $member['role'] === 'admin';
        
        if (!$isOwner && !$isKetua && $user['role'] !== 'admin') {
            json_response(['success' => false, 'message' => 'Hanya guru, ketua kelas, atau admin yang dapat melihat analytics.'], 403);
        }

        // Load Syllabus Map for Option Mapping
        $syllabusFile = __DIR__ . '/../../../storage/ruangan/' . $ruanganId . '.json';
            
        $syllabusMap = [];
        if (is_file($syllabusFile)) {
            $raw = json_decode((string) file_get_contents($syllabusFile), true);
            if (is_array($raw) && isset($raw['nodes'])) {
                foreach ($raw['nodes'] as $node) {
                    if (!empty($node['data']['label']) && !empty($node['data']['items'])) {
                        $nodeLabel = trim($node['data']['label']);
                        foreach ($node['data']['items'] as $item) {
                            if ($item['type'] === 'kuis' && !empty($item['quiz']['question'])) {
                                $q = trim($item['quiz']['question']);
                                $syllabusMap[$nodeLabel][$q] = $item['quiz'];
                            }
                        }
                    }
                }
            }
        }

        $stmt = $db->prepare("
            SELECT qa.node_label, qa.wrong_answers 
            FROM quiz_attempts qa
            JOIN class_members cm ON qa.user_id = cm.user_id AND qa.ruangan_id = cm.ruangan_id
            JOIN users u ON qa.user_id = u.id
            WHERE qa.ruangan_id = ? AND u.role != 'teacher'
        ");
        $stmt->execute([$ruanganId]);
        $attempts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $nodeAttemptsCount = [];
        $mistakes = [];
        foreach ($attempts as $row) {
            $nodeLabel = $row['node_label'];
            $nodeAttemptsCount[$nodeLabel] = ($nodeAttemptsCount[$nodeLabel] ?? 0) + 1;

            if (!$row['wrong_answers']) continue;
            
            $wrongArray = json_decode($row['wrong_answers'], true);
            if (!is_array($wrongArray)) continue;

            $uniqueQuestions = [];
            foreach ($wrongArray as $item) {
                // Handle legacy format (string)
                if (is_string($item)) {
                    $question = $item;
                    $selectedAnswer = 'Salah';
                } else if (is_array($item)) {
                    // Handle new format (object)
                    $question = $item['question'] ?? 'Unknown';
                    $selectedAnswer = $item['selectedAnswer'] ?? 'Salah';
                    if ($selectedAnswer === 'Pilihan Ganda') $selectedAnswer = 'Salah';
                } else {
                    continue;
                }

                // Avoid double counting same wrong answer per attempt
                $qKey = md5($question);
                if (isset($uniqueQuestions[$qKey])) continue;
                $uniqueQuestions[$qKey] = true;

                $key = md5($row['node_label'] . $question);
                $quizObj = null;
                if (isset($syllabusMap[$row['node_label']][$question])) {
                    $quizObj = $syllabusMap[$row['node_label']][$question];
                } else if (isset($syllabusMap[$row['node_label']])) {
                    // Fuzzy search
                    $bestMatch = null;
                    $bestPercent = 0;
                    foreach($syllabusMap[$row['node_label']] as $qText => $qObj) {
                        similar_text($question, $qText, $percent);
                        if ($percent > 70 && $percent > $bestPercent) {
                            $bestPercent = $percent;
                            $bestMatch = $qObj;
                        }
                    }
                    $quizObj = $bestMatch;
                }

                if (!isset($mistakes[$key])) {
                    $mistakes[$key] = [
                        'node_label' => $row['node_label'],
                        'question' => $question,
                        'total_wrong' => 0,
                        'answers_breakdown' => [],
                        'correct_mapped' => null,
                        'options_map' => []
                    ];
                    
                    // Pre-fill A, B, C, D if present in syllabus using RAW string keys
                    if ($quizObj) {
                        $options = $quizObj['options'] ?? [];
                        $correctAns = $quizObj['correctAnswer'] ?? null;
                        
                        foreach($options as $oIdx => $opt) {
                            if (trim((string)$opt) === '') continue; // Skip empty options
                            $letter = chr(65 + $oIdx);
                            $optStr = trim((string)$opt);
                            $mistakes[$key]['options_map'][$optStr] = $letter;

                            if ($optStr === trim((string)$correctAns)) {
                                $mistakes[$key]['correct_mapped'] = $optStr;
                            } else {
                                $mistakes[$key]['answers_breakdown'][$optStr] = 0;
                            }
                        }
                    }
                }

                // Map to raw string
                $mappedAnswer = trim((string)$selectedAnswer);
                if ($quizObj) {
                    $options = $quizObj['options'] ?? [];
                    $found = false;
                    foreach($options as $oIdx => $opt) {
                        if (trim((string)$opt) === trim((string)$selectedAnswer)) {
                            $mappedAnswer = trim((string)$opt);
                            $found = true;
                            break;
                        }
                    }
                    if (!$found && $selectedAnswer === 'Salah') {
                        $mappedAnswer = 'Salah';
                    }
                }

                $mistakes[$key]['total_wrong']++;
                if (!isset($mistakes[$key]['answers_breakdown'][$mappedAnswer])) {
                    $mistakes[$key]['answers_breakdown'][$mappedAnswer] = 0;
                }
                $mistakes[$key]['answers_breakdown'][$mappedAnswer]++;
            }
        }

        // Format and sort
        $result = array_values($mistakes);
        foreach ($result as &$res) {
            $nodeTotal = $nodeAttemptsCount[$res['node_label']] ?? 0;
            $res['total_attempts'] = $nodeTotal;
            $res['total_correct'] = max(0, $nodeTotal - $res['total_wrong']);

            $breakdownArray = [];
            
            // Add correct answers first
            if ($res['total_correct'] > 0 || $res['correct_mapped'] !== null) {
                $ansStr = $res['correct_mapped'] ?? 'Benar';
                $breakdownArray[] = [
                    'answer' => $ansStr,
                    'count' => $res['total_correct'],
                    'isCorrect' => true,
                    'letter' => $res['options_map'][$ansStr] ?? null
                ];
            }

            foreach ($res['answers_breakdown'] as $ans => $count) {
                $breakdownArray[] = [
                    'answer' => $ans,
                    'count' => $count,
                    'isCorrect' => false,
                    'letter' => $res['options_map'][$ans] ?? null
                ];
            }
            // Sort alphabetically by option letter if available, else by answer
            usort($breakdownArray, function($a, $b) {
                if ($a['letter'] && $b['letter']) return strcmp($a['letter'], $b['letter']);
                return strcmp($a['answer'], $b['answer']);
            });
            $res['answers_breakdown'] = $breakdownArray;
        }
        
        usort($result, function($a, $b) {
            return $b['total_wrong'] <=> $a['total_wrong']; // sort descending
        });

        json_response([
            'success' => true,
            'data' => array_slice($result, 0, 10) // Top 10
        ]);
    }

    // === STUDENT PROGRESS (untuk murid yang login) ===
    if ($action === 'student_progress') {
        $stmt = $db->prepare(
            'SELECT node_id, node_label, score, correct_answers, total_questions, created_at
             FROM quiz_attempts
             WHERE ruangan_id = ? AND user_id = ?
             ORDER BY created_at DESC'
        );
        $stmt->execute([$ruanganId, (int) $user['id']]);
        $attempts = $stmt->fetchAll();

        json_response([
            'success'  => true,
            'attempts' => $attempts,
        ]);
    }

    // === AI CHAT HISTORY (Guru melihat riwayat chat murid dari JSON files) ===
    if ($action === 'chat_history') {
        $stmt = $db->prepare('SELECT user_id, kode_ruangan FROM ruangan WHERE id = ?');
        $stmt->execute([$ruanganId]);
        $room = $stmt->fetch();
        $isOwner = $room && (int) $room['user_id'] === (int) $user['id'];
        
        if (!$isOwner && $user['role'] !== 'admin') {
            json_response(['success' => false, 'message' => 'Hanya guru pembuat ruangan atau admin yang bisa melihat riwayat chat.'], 403);
        }

        $studentId = (int) ($_GET['student_id'] ?? 0);
        $nodeId = $_GET['node_id'] ?? '';
        $roomCode = $room['kode_ruangan'] ?? '';

        $chatDir = __DIR__ . '/../../../storage/chat';
        $students = [];
        $allChats = [];

        // Scan semua folder murid yang punya chat di ruangan ini
        if (is_dir($chatDir)) {
            $userDirs = array_filter(glob($chatDir . '/*'), 'is_dir');
            foreach ($userDirs as $userDir) {
                $userName = basename($userDir);
                $roomChatDir = $userDir . '/' . $roomCode;
                $chatFile = $roomChatDir . '/chat.json';

                if (!is_file($chatFile)) continue;

                $chatData = json_decode((string) file_get_contents($chatFile), true);
                if (!is_array($chatData)) continue;

                // Filter by student_id if specified
                $chatUserId = $chatData['user_id'] ?? 0;
                if ($studentId > 0 && (int) $chatUserId !== $studentId) continue;

                $studentName = $chatData['user_name'] ?? $userName;
                $students[$chatUserId] = ['id' => (int) $chatUserId, 'name' => $studentName];

                $messages = $chatData['messages'] ?? [];
                foreach ($messages as $msg) {
                    $msgNodeId = $msg['node_id'] ?? '';
                    if ($nodeId !== '' && $msgNodeId !== $nodeId) continue;

                    $allChats[] = [
                        'user_id'      => (int) $chatUserId,
                        'student_name' => $studentName,
                        'node_id'      => $msgNodeId,
                        'node_label'   => $msg['node_label'] ?? '',
                        'role'         => $msg['role'] ?? 'user',
                        'content'      => $msg['content'] ?? '',
                        'created_at'   => $msg['created_at'] ?? '',
                    ];
                }
            }
        }

        // Sort by user_id, node_id, created_at
        usort($allChats, function($a, $b) {
            if ($a['user_id'] !== $b['user_id']) return $a['user_id'] <=> $b['user_id'];
            if ($a['node_id'] !== $b['node_id']) return strcmp($a['node_id'], $b['node_id']);
            return strcmp($a['created_at'], $b['created_at']);
        });

        json_response([
            'success'  => true,
            'students' => array_values($students),
            'chats'    => $allChats,
        ]);
    }

    // === ANALYTICS CHEATING (Murid yang pindah tab saat quiz) ===
    if ($action === 'analytics_cheating') {
        $stmt = $db->prepare('SELECT user_id FROM ruangan WHERE id = ?');
        $stmt->execute([$ruanganId]);
        $room = $stmt->fetch();
        $isOwner = $room && (int) $room['user_id'] === (int) $user['id'];

        $isKetua = false;
        if (!$isOwner) {
            $stmtRole = $db->prepare("SELECT role FROM class_members WHERE ruangan_id = ? AND user_id = ?");
            $stmtRole->execute([$ruanganId, (int) $user['id']]);
            $member = $stmtRole->fetch();
            $isKetua = $member && $member['role'] === 'admin';
        }

        if (!$isOwner && !$isKetua && $user['role'] !== 'admin') {
            json_response(['success' => false, 'message' => 'Hanya guru atau ketua kelas yang bisa melihat data ini.'], 403);
        }

        // Ambil murid yang pernah pindah tab (tab_switches > 0)
        $stmt = $db->prepare(
            "SELECT qa.user_id, u.name, u.email,
                    COUNT(qa.id) AS total_attempts,
                    SUM(qa.tab_switches) AS total_switches,
                    ROUND(AVG(qa.score), 1) AS avg_score,
                    MAX(qa.tab_switches) AS max_switches_per_attempt,
                    MAX(qa.created_at) AS last_attempt
             FROM quiz_attempts qa
             JOIN users u ON u.id = qa.user_id
             INNER JOIN class_members cm ON cm.user_id = qa.user_id AND cm.ruangan_id = qa.ruangan_id
             WHERE qa.ruangan_id = ? AND qa.tab_switches > 0
             GROUP BY qa.user_id, u.name, u.email
             ORDER BY total_switches DESC"
        );
        $stmt->execute([$ruanganId]);
        $cheaters = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Detail per attempt untuk murid yang curang
        $details = [];
        if (!empty($cheaters)) {
            $userIds = array_column($cheaters, 'user_id');
            $placeholders = implode(',', array_fill(0, count($userIds), '?'));
            $stmt = $db->prepare(
                "SELECT qa.user_id, u.name, qa.node_label, qa.score, qa.tab_switches, qa.created_at
                 FROM quiz_attempts qa
                 JOIN users u ON u.id = qa.user_id
                 WHERE qa.ruangan_id = ? AND qa.tab_switches > 0
                 ORDER BY qa.user_id, qa.created_at DESC"
            );
            $stmt->execute([$ruanganId]);
            $details = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        json_response([
            'success' => true,
            'cheaters' => $cheaters,
            'details'  => $details,
        ]);
    }

    json_response(['success' => false, 'message' => 'Action tidak dikenal.'], 400);
}

// -------------------------------------------------------
// POST — submit jawaban kuis
// -------------------------------------------------------
if ($method === 'POST') {
    if (!csrf_header_verify()) {
        json_response(['success' => false, 'message' => 'Sesi tidak valid.'], 403);
    }

    $body   = read_json_body();
    $action = (string) ($body['action'] ?? '');

    if ($action === 'submit') {
        // Hanya murid yang boleh submit
        if (($user['role'] ?? '') !== 'student') {
            json_response(['success' => false, 'message' => 'Hanya murid yang bisa mengerjakan kuis.'], 403);
        }

        $ruanganId      = (int) ($body['ruangan_id'] ?? 0);
        $nodeId         = (string) ($body['node_id'] ?? '');
        $nodeLabel      = (string) ($body['node_label'] ?? '');
        $score          = max(0, min(100, (int) ($body['score'] ?? 0)));
        $totalQuestions = max(0, (int) ($body['total_questions'] ?? 0));
        $correctAnswers = max(0, (int) ($body['correct_answers'] ?? 0));
        $wrongAnswers   = isset($body['wrong_answers']) && is_array($body['wrong_answers'])
                            ? json_encode($body['wrong_answers'], JSON_UNESCAPED_UNICODE)
                            : null;

        if (!$ruanganId || !$nodeId) {
            json_response(['success' => false, 'message' => 'ruangan_id dan node_id wajib diisi.'], 400);
        }

        // Pastikan murid memang anggota kelas ini
        $stmt = $db->prepare('SELECT id FROM class_members WHERE ruangan_id = ? AND user_id = ?');
        $stmt->execute([$ruanganId, (int) $user['id']]);
        if (!$stmt->fetch()) {
            json_response(['success' => false, 'message' => 'Anda bukan anggota kelas ini.'], 403);
        }

        $tabSwitches = max(0, (int) ($body['tab_switches'] ?? 0));

        $stmt = $db->prepare(
            'INSERT IGNORE INTO quiz_attempts (ruangan_id, user_id, node_id, node_label, score, total_questions, correct_answers, wrong_answers, tab_switches)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $ruanganId,
            (int) $user['id'],
            $nodeId,
            $nodeLabel,
            $score,
            $totalQuestions,
            $correctAnswers,
            $wrongAnswers,
            $tabSwitches,
        ]);

        json_response([
            'success' => true,
            'message' => 'Jawaban berhasil dicatat!',
            'attempt_id' => (int) $db->lastInsertId(),
        ]);
    }

    // === SAVE AI CHAT HISTORY (JSON file) ===
    if ($action === 'save_chat') {
        $ruanganId  = (int) ($body['ruangan_id'] ?? 0);
        $nodeId     = (string) ($body['node_id'] ?? '');
        $nodeLabel  = (string) ($body['node_label'] ?? '');
        $messages   = $body['messages'] ?? [];

        if (!$ruanganId || empty($messages)) {
            json_response(['success' => false, 'message' => 'ruangan_id dan messages wajib diisi.'], 400);
        }

        // Pastikan user adalah anggota kelas ini
        $stmt = $db->prepare('SELECT id FROM class_members WHERE ruangan_id = ? AND user_id = ?');
        $stmt->execute([$ruanganId, (int) $user['id']]);
        if (!$stmt->fetch()) {
            json_response(['success' => false, 'message' => 'Anda bukan anggota kelas ini.'], 403);
        }

        // Ambil nama user dan kode ruangan
        $stmt = $db->prepare('SELECT name FROM users WHERE id = ?');
        $stmt->execute([(int) $user['id']]);
        $userName = $stmt->fetchColumn() ?: 'unknown';

        $stmt = $db->prepare('SELECT kode_ruangan FROM ruangan WHERE id = ?');
        $stmt->execute([$ruanganId]);
        $roomCode = $stmt->fetchColumn() ?: 'unknown';

        // Buat path: storage/chat/[nama_user]/[code_ruangan]/chat.json
        // Sanitize nama user untuk filesystem (hapus karakter yang tidak aman)
        $safeUserName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $userName);
        $chatDir = __DIR__ . '/../../../storage/chat/' . $safeUserName . '/' . $roomCode;
        if (!is_dir($chatDir)) {
            mkdir($chatDir, 0775, true);
        }

        $chatFile = $chatDir . '/chat.json';

        // Baca file lama jika ada
        $existingData = [];
        if (is_file($chatFile)) {
            $existingData = json_decode((string) file_get_contents($chatFile), true);
            if (!is_array($existingData)) $existingData = [];
        }

        // Update messages untuk node ini (replace per node)
        if (!isset($existingData['messages'])) $existingData['messages'] = [];

        // Hapus messages lama untuk node ini
        $existingData['messages'] = array_filter($existingData['messages'], function($m) use ($nodeId) {
            return ($m['node_id'] ?? '') !== $nodeId;
        });

        // Tambah messages baru
        $now = date('Y-m-d H:i:s');
        foreach ($messages as $msg) {
            $role = ($msg['role'] === 'user') ? 'user' : 'model';
            $content = (string) ($msg['content'] ?? '');
            if ($content !== '') {
                $existingData['messages'][] = [
                    'node_id'    => $nodeId,
                    'node_label' => $nodeLabel,
                    'role'       => $role,
                    'content'    => $content,
                    'created_at' => $now,
                ];
            }
        }

        // Metadata
        $existingData['user_id'] = (int) $user['id'];
        $existingData['user_name'] = $userName;
        $existingData['ruangan_id'] = $ruanganId;
        $existingData['room_code'] = $roomCode;
        $existingData['updated_at'] = $now;

        // Tulis atomik (temp + rename)
        $json = json_encode($existingData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $tmp = $chatFile . '.tmp';
        if (file_put_contents($tmp, $json) !== false) {
            rename($tmp, $chatFile);
        }

        json_response(['success' => true, 'message' => 'Riwayat chat berhasil disimpan.']);
    }

    json_response(['success' => false, 'message' => 'Action tidak dikenal.'], 400);
}

json_response(['success' => false, 'message' => 'Method tidak diizinkan.'], 405);
