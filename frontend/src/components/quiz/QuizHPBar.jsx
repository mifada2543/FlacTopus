import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Skull } from 'lucide-react';

export function StudentHPBar({ hp, maxHp }) {
  const percentage = (hp / maxHp) * 100;
  const color = percentage > 50 ? '#22c55e' : percentage > 25 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ width: '100%', maxWidth: '300px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <Heart size={16} color={color} fill={color} />
        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontFamily: 'Space Grotesk, sans-serif' }}>
          HP Kamu
        </span>
        <span style={{ color, fontSize: '0.85rem', fontFamily: 'Press Start 2P, monospace', marginLeft: 'auto' }}>
          {hp}/{maxHp}
        </span>
      </div>
      <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ height: '100%', background: `linear-gradient(90deg, ${color}, ${color}dd)`, borderRadius: '6px' }}
        />
      </div>
    </div>
  );
}

export function BossHPBar({ hp, maxHp, bossName }) {
  const percentage = (hp / maxHp) * 100;

  return (
    <div style={{ width: '100%', maxWidth: '400px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <Skull size={16} color="#ef4444" />
        <span style={{ color: '#ef4444', fontSize: '0.85rem', fontFamily: 'Press Start 2P, monospace' }}>
          {bossName || 'BOSS'}
        </span>
        <span style={{ color: '#ef4444', fontSize: '0.85rem', fontFamily: 'Press Start 2P, monospace', marginLeft: 'auto' }}>
          {hp}/{maxHp}
        </span>
      </div>
      <div style={{ width: '100%', height: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden', border: '2px solid rgba(239,68,68,0.3)' }}>
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ height: '100%', background: 'linear-gradient(90deg, #dc2626, #ef4444)', borderRadius: '6px' }}
        />
      </div>
    </div>
  );
}
