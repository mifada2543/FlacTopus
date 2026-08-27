import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        .navbar-container {
          padding: 0 2rem;
        }
        .logo-gap {
          gap: 4px; /* Dideketin biar gak musuhan */
        }
        @media (max-width: 768px) {
          .navbar-container {
            padding: 0 1rem; /* Biar gak mepet layar di HP */
          }
          .logo-gap {
            gap: 0px;
          }
          .logo-text {
            font-size: 1.2rem !important;
          }
          .logo-img {
            width: 44px !important;
            height: 44px !important;
          }
          .btn-masuk {
            padding: 0.5rem 1rem !important;
            font-size: 0.9rem !important;
          }
        }
      `}</style>
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="navbar-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          zIndex: 1000
        }}
      >
        {/* Logo */}
        <div 
          className="logo-gap"
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          <img 
            className="logo-img"
            src={`${import.meta.env.BASE_URL}assets/flactopus-logo.png`} 
            alt="FlacTopus Logo" 
            style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'contain' }} 
          />
          <span className="logo-text" style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff', letterSpacing: '0.5px' }}>
            Flac<span style={{ color: 'var(--accent-green)' }}>Topus</span>
          </span>
        </div>

        {/* Action Button */}
        <button 
          className="btn-masuk"
          onClick={() => navigate('/login')}
          style={{
            padding: '0.6rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'var(--accent-green)';
            e.currentTarget.style.color = '#000';
            e.currentTarget.style.borderColor = 'var(--accent-green)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          Masuk Kelas
        </button>
      </motion.nav>
    </>
  );
}
