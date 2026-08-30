import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Leaf, User, Mail, Lock, Key, UserPlus, Loader2, GraduationCap, BookOpen } from 'lucide-react';
import { AUTH_API } from '../utils/api';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot field (anti-bot)
  const [role, setRole] = useState('student'); // student atau teacher
  const [masterKey, setMasterKey] = useState(''); // Master Key untuk guru
  const [error, setError] = useState('');
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [mounted, setMounted] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    setMounted(true);
    let active = true;
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

  // Tampilkan loading selama cek session (cegah flash halaman register)
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
    if (name.trim().length < 3) { setError('Nama minimal 3 karakter.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Format email tidak valid.'); return; }
    if (password.length < 8) { setError('Password minimal 8 karakter.'); return; }
    if (password !== confirm) { setError('Konfirmasi password tidak sama.'); return; }

    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${AUTH_API}/register.php`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ name, email, password, role, website, master_key: masterKey }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.auto_login) {
          // Auto-login: langsung ke halaman kelas
          navigate('/classes', { replace: true });
        } else {
          // Pending: redirect ke login dengan pesan
          navigate('/login', { state: { registered: true, pending: true } });
        }
      } else if (res.status === 429) {
        setIsRateLimited(true);
        setError(data.message || 'Terlalu banyak percobaan. Coba lagi nanti.');
      } else {
        setError(data.message || 'Registrasi gagal.');
      }
    } catch {
      setError('Gagal terhubung ke server. Pastikan Apache & MySQL berjalan.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.9rem 1rem 0.9rem 2.8rem',
    background: '#0f172a',
    border: '1px solid var(--border-color)',
    color: 'white',
    borderRadius: '12px',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.2s',
  };

  const iconStyle = { position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' };

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
        maxWidth: 440,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(24px)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div className="glass-panel auth-form" style={{ padding: 'clamp(1.5rem, 5vw, 2.5rem)', borderRadius: '20px' }}>
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
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Buat Akun Baru</h1>
            <p style={{ color: 'var(--text-muted)', margin: '0.4rem 0 0', fontSize: '0.95rem' }}>
              Bergabunglah ke ekspedisi Rainforest of Innovation
            </p>
          </div>

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
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Nama Lengkap</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={iconStyle} />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kamu" style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-green)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')} />
              </div>
            </div>

            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={iconStyle} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@contoh.com" style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-green)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')} />
              </div>
            </div>

            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={iconStyle} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-green)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')} />
              </div>
            </div>

            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Ulangi Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={iconStyle} />
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Ulangi password" style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-green)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')} />
              </div>
            </div>

            {/* Role Toggle: Murid atau Guru */}
            <div style={{ marginBottom: '1.3rem' }}>
              <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Daftar Sebagai</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  style={{
                    flex: 1, padding: '0.75rem', borderRadius: '10px',
                    border: `2px solid ${role === 'student' ? 'var(--accent-green)' : 'var(--border-color)'}`,
                    background: role === 'student' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                    color: role === 'student' ? 'var(--accent-green)' : 'var(--text-muted)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                  }}
                >
                  <BookOpen size={18} /> Murid
                </button>
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  style={{
                    flex: 1, padding: '0.75rem', borderRadius: '10px',
                    border: `2px solid ${role === 'teacher' ? '#3b82f6' : 'var(--border-color)'}`,
                    background: role === 'teacher' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    color: role === 'teacher' ? '#60a5fa' : 'var(--text-muted)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                  }}
                >
                  <GraduationCap size={18} /> Guru
                </button>
              </div>
            </div>

            {/* Master Key Input — muncul jika role = teacher */}
            {role === 'teacher' && (
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.45rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>
                  🔑 Master Key <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opsional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Key size={18} style={iconStyle} />
                  <input
                    type="text"
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    placeholder="Masukkan Master Key jika punya"
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                  />
                </div>
                <div style={{ marginTop: '0.5rem', padding: '0.6rem', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {masterKey ? (
                    <span style={{ color: '#60a5fa' }}>✅ Dengan Master Key: Akun langsung aktif</span>
                  ) : (
                    <span>Tanpa Master Key: Akun perlu verifikasi admin</span>
                  )}
                </div>
              </div>
            )}

            {/* Honeypot Field — tersembunyi dari manusia, terlihat oleh bot */}
            <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                type="text"
                id="website"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex="-1"
                autoComplete="off"
              />
            </div>

            <div style={{ marginBottom: '1.6rem', padding: '0.8rem 1rem', background: role === 'student' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)', border: `1px solid ${role === 'student' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`, borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {role === 'student' ? '📚' : '👨‍🏫'} Mendaftar sebagai <strong style={{ color: role === 'student' ? 'var(--accent-green)' : '#60a5fa' }}>{role === 'student' ? 'Murid' : 'Guru'}</strong>
              {role === 'teacher' && <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>(langsung aktif)</span>}
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
              {isLoading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={20} />}
              {isLoading ? 'Memproses...' : 'Daftar'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '1.5rem', fontSize: '0.9rem' }}>
            Sudah punya akun?{' '}
            <Link to="/login" style={{ color: 'var(--accent-green)', fontWeight: 600, textDecoration: 'none' }}>
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
