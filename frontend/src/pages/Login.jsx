import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Leaf, Mail, Lock, LogIn, Loader2 } from 'lucide-react';
import { AUTH_API } from '../utils/api';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [mounted, setMounted] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  const justRegistered = location.state?.registered === true;
  const pendingApproval = location.state?.pending === true;

  useEffect(() => {
    setMounted(true);
    let active = true;
    // Cek session PHP: sudah login? + ambil token CSRF
    fetch(`${AUTH_API}/session.php`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setCsrfToken(d.csrf_token || '');
        if (d.logged_in && d.user) {
          // Sudah login → langsung redirect (cegah double session)
          navigate('/classes', { replace: true });
          return;
        }
        setSessionChecked(true);
      })
      .catch(() => {
        if (active) setSessionChecked(true);
      });
    return () => { active = false; };
  }, [navigate]);

  // Tampilkan loading selama cek session (cegah flash halaman login)
  if (!sessionChecked) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <span>Memeriksa sesi...</span>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Isi email dan password terlebih dahulu.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${AUTH_API}/login.php`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        // Kembali ke halaman yang tadi dituju (disimpan ProtectedRoute di state.from)
        const from = location.state?.from?.pathname;
        navigate(from && from !== '/login' && from !== '/register' ? from : '/classes');
      } else if (res.status === 429) {
        // Rate limited — terlalu banyak percobaan gagal
        setIsRateLimited(true);
        setError(data.message || 'Terlalu banyak percobaan. Coba lagi nanti.');
      } else {
        setError(data.message || 'Login gagal. Coba lagi.');
      }
    } catch {
      setError('Gagal terhubung ke server. Pastikan Apache & MySQL berjalan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'clamp(1rem, 4vw, 2rem)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div className="brilliant-bg" />

      <div style={{
        width: '100%',
        maxWidth: 420,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(24px)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div className="glass-panel auth-form" style={{ padding: 'clamp(1.5rem, 5vw, 2.5rem)', borderRadius: '20px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.4rem 1rem',
              borderRadius: '50px',
              marginBottom: '1.2rem',
              color: 'var(--accent-green)',
            }}>
              <Leaf size={16} />
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px' }}>OSCAR 3.0 Web Dev</span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Selamat Datang!</h1>
            <p style={{ color: 'var(--text-muted)', margin: '0.4rem 0 0', fontSize: '0.95rem' }}>
              Masuk untuk melanjutkan ekspedisi belajarmu
            </p>
          </div>

          {/* Pesan sukses registrasi */}
          {justRegistered && pendingApproval && (
            <div style={{
              background: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid #eab308',
              color: '#fbbf24',
              padding: '0.7rem 1rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              marginBottom: '1.2rem',
              textAlign: 'center',
            }}>
              ⏳ Registrasi berhasil! Akun Anda menunggu persetujuan admin. Anda akan bisa login setelah disetujui.
            </div>
          )}
          {justRegistered && !pendingApproval && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid var(--accent-green)',
              color: 'var(--accent-green)',
              padding: '0.7rem 1rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              marginBottom: '1.2rem',
              textAlign: 'center',
            }}>
              ✅ Registrasi berhasil! Silakan login.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className={isRateLimited ? '' : 'error-shake'} style={{
              background: isRateLimited ? 'rgba(234, 179, 8, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${isRateLimited ? '#eab308' : '#ef4444'}`,
              color: isRateLimited ? '#fbbf24' : '#f87171',
              padding: '0.7rem 1rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              marginBottom: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              {isRateLimited ? '🔒 ' : '⚠️ '}{error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@contoh.com"
                  autoComplete="email"
                  style={{
                    width: '100%',
                    padding: '0.9rem 1rem 0.9rem 2.8rem',
                    background: '#0f172a',
                    border: '1px solid var(--border-color)',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-green)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.8rem' }}>
              <label style={{ display: 'block', marginBottom: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '0.9rem 1rem 0.9rem 2.8rem',
                    background: '#0f172a',
                    border: '1px solid var(--border-color)',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-green)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isRateLimited || !csrfToken}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '0.95rem',
                fontSize: '1.05rem',
                fontWeight: 'bold',
                background: 'var(--accent-green)',
                color: '#000',
                border: 'none',
                borderRadius: '12px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: isLoading ? 0.7 : 1,
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.3s',
              }}
            >
              {isLoading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <LogIn size={20} />}
              {isLoading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '1.5rem', fontSize: '0.9rem' }}>
            Belum punya akun?{' '}
            <Link to="/register" style={{ color: 'var(--accent-green)', fontWeight: 600, textDecoration: 'none' }}>
              Daftar di sini
            </Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '1.2rem', fontSize: '0.75rem', opacity: 0.5 }}>
          Akun demo tersedia di database (hubungi admin)
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
