import { useEffect, useState, useCallback } from 'react';
import { AUTH_API } from '../utils/api';
import { ROLE } from '../utils/roles';

/**
 * useAuth — kontrol akses berbasis session PHP.
 *
 * Memanggil auth/session.php untuk mengecek status login (sumber kebenaran
 * ada di server/PHP). Mengembalikan:
 *   - user      : { id, name, email, role } | null (null = guest / belum login)
 *   - role      : 'guest' | 'student' | 'teacher' | 'admin' (role awal = guest)
 *   - loading   : true selama pengecekan pertama
 *   - csrfToken : token CSRF untuk request POST API
 *   - refresh() : periksa ulang status login
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState('');

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${AUTH_API}/session.php`, { credentials: 'same-origin' });
      const data = await res.json();
      setCsrfToken(data.csrf_token || '');
      if (data.logged_in && data.user) {
        setUser(data.user);
        // Cache ringan untuk ditampilkan (sumber kebenaran tetap session PHP)
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        return data.user;
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, role: user?.role ?? ROLE.GUEST, loading, csrfToken, refresh };
}
