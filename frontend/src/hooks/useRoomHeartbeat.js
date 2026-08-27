import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { RUANGAN_API } from '../utils/api';

/**
 * useRoomHeartbeat — "Ada orang disini?" → browser menjawab "Ya, ada".
 *
 * Selama halaman ruangan terbuka, hook ini mengirim sinyal ke server setiap
 * `intervalMs` (default 3 menit) + sekali langsung saat halaman dibuka.
 * Server mencatatnya sebagai aktivitas (keep-alive timer 2 jam ruangan) dan
 * status online per murid.
 *
 * Jika browser ditutup / tab tidak respons, sinyal berhenti → server melihat
 * ruangan sebagai "Tidak ada" dan akhirnya ruangan kedaluwarsa.
 *
 * Pemakaian:
 *   useRoomHeartbeat(roomId); // roomId dari useParams
 */
export function useRoomHeartbeat(roomId, intervalMs = 3 * 60 * 1000) {
  const { csrfToken } = useAuth();

  useEffect(() => {
    if (!roomId || !csrfToken) return;

    const beat = () => {
      fetch(`${RUANGAN_API}/ruangan.php`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ action: 'heartbeat', id: Number(roomId) }),
      }).catch(() => { /* abaikan — sinyal berikutnya tetap dikirim */ });
    };

    beat(); // langsung jawab sekali
    const iv = setInterval(beat, intervalMs);
    return () => clearInterval(iv);
  }, [roomId, csrfToken, intervalMs]);
}
