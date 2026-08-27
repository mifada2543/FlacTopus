import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, Lock, AlertTriangle, SearchX, ServerCrash, ArrowLeft, Home, LogIn } from 'lucide-react';

/**
 * ErrorPage — halaman error universal.
 *
 * Mencegah information leakage: tidak menampilkan detail teknis
 * seperti stack trace, path file, atau versi software.
 *
 * @param {number}  statusCode  HTTP status code (401, 403, 404, 429, 500)
 * @param {string}  message     Pesan opsional (default: pesan bawaan per kode)
 * @param {boolean} showLogin   Tampilkan tombol login (default: true untuk 401/403)
 */
export default function ErrorPage({ statusCode = 404, message, showLogin }) {
  const navigate = useNavigate();

  // Konfigurasi per kode error
  const errorConfig = {
    401: {
      icon: <Lock size={48} />,
      title: 'Akses Ditolak',
      subtitle: 'Anda belum login',
      description: 'Silakan login terlebih dahulu untuk mengakses halaman ini.',
      color: '#fbbf24',
      bgColor: 'rgba(234, 179, 8, 0.1)',
      borderColor: 'rgba(234, 179, 8, 0.3)',
      showLogin: true,
      showHome: true,
    },
    403: {
      icon: <ShieldAlert size={48} />,
      title: 'Dilarang Masuk',
      subtitle: 'Tidak punya izin',
      description: 'Anda tidak memiliki izin untuk mengakses halaman ini. Jika Anda merasa ini adalah kesalahan, hubungi administrator.',
      color: '#f87171',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      showLogin: false,
      showHome: true,
    },
    404: {
      icon: <SearchX size={48} />,
      title: 'Halaman Tidak Ditemukan',
      subtitle: '404',
      description: 'Halaman yang Anda cari tidak ada atau sudah dipindahkan.',
      color: 'var(--text-muted)',
      bgColor: 'var(--bg-card)',
      borderColor: 'var(--border-color)',
      showLogin: false,
      showHome: true,
    },
    429: {
      icon: <AlertTriangle size={48} />,
      title: 'Terlalu Banyak Permintaan',
      subtitle: 'Rate Limited',
      description: 'Anda melakukan terlalu banyak permintaan dalam waktu singkat. Silakan tunggu beberapa saat sebelum mencoba lagi.',
      color: '#fbbf24',
      bgColor: 'rgba(234, 179, 8, 0.1)',
      borderColor: 'rgba(234, 179, 8, 0.3)',
      showLogin: false,
      showHome: true,
    },
    500: {
      icon: <ServerCrash size={48} />,
      title: 'Kesalahan Server',
      subtitle: '500',
      description: 'Terjadi kesalahan internal pada server. Tim kami telah diberitahu. Silakan coba lagi nanti.',
      color: '#f87171',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      showLogin: false,
      showHome: true,
    },
  };

  const config = errorConfig[statusCode] || errorConfig[404];
  const displayMessage = message || config.description;
  const displayLogin = showLogin !== undefined ? showLogin : config.showLogin;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div className="brilliant-bg" />

      <div style={{
        width: '100%',
        maxWidth: 480,
        textAlign: 'center',
      }}>
        {/* Icon */}
        <div className="error-page-icon" style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 'clamp(70px, 15vw, 100px)',
          height: 'clamp(70px, 15vw, 100px)',
          borderRadius: '50%',
          background: config.bgColor,
          border: `2px solid ${config.borderColor}`,
          color: config.color,
          marginBottom: '1.5rem',
          boxShadow: `0 0 30px ${config.bgColor}`,
        }}>
          {config.icon}
        </div>

        {/* Error Code */}
        <div className="error-page-code" style={{
          fontSize: 'clamp(3.5rem, 10vw, 5rem)',
          fontWeight: 900,
          color: config.color,
          opacity: 0.3,
          lineHeight: 1,
          marginBottom: '-0.5rem',
          letterSpacing: '-4px',
        }}>
          {statusCode}
        </div>

        {/* Title */}
        <h1 className="error-page-title" style={{
          fontSize: 'clamp(1.4rem, 4vw, 1.8rem)',
          fontWeight: 800,
          color: 'var(--text-main)',
          margin: '0 0 0.5rem',
        }}>
          {config.title}
        </h1>

        {/* Subtitle */}
        <p style={{
          color: config.color,
          fontSize: '0.9rem',
          fontWeight: 600,
          margin: '0 0 1rem',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          {config.subtitle}
        </p>

        {/* Description */}
        <p style={{
          color: 'var(--text-muted)',
          fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
          lineHeight: 1.6,
          margin: '0 0 2rem',
          maxWidth: '380px',
          marginLeft: 'auto',
          marginRight: 'auto',
          padding: '0 1rem',
        }}>
          {displayMessage}
        </p>

        {/* Actions */}
        <div className="btn-group-responsive" style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {displayLogin && (
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--accent-green)',
                color: '#000',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.95rem',
                transition: 'all 0.2s',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)',
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 25px rgba(16, 185, 129, 0.5)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.3)'; }}
            >
              <LogIn size={18} /> Login
            </button>
          )}

          {config.showHome && (
            <Link
              to="/"
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.95rem',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-green)'; e.currentTarget.style.color = 'var(--accent-green)'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <Home size={18} /> Beranda
            </Link>
          )}

          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.95rem',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-green)'; e.currentTarget.style.color = 'var(--accent-green)'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <ArrowLeft size={18} /> Kembali
          </button>
        </div>

        {/* Security notice — tidak menampilkan detail teknis */}
        <p style={{
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          marginTop: '2.5rem',
          opacity: 0.5,
        }}>
          Jika masalah berlanjut, hubungi administrator.
        </p>
      </div>
    </div>
  );
}
