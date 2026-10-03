import React, { useState } from 'react';
import { X, Copy, Check, Share2, Smartphone, Heart, Sparkles } from 'lucide-react';

export default function SharePartnerModal({
  isOpen,
  onClose,
  spaceId,
  tripName,
  partners,
  currentPartnerId
}) {
  const [copiedPartner, setCopiedPartner] = useState(false);
  const [copiedMine, setCopiedMine] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const targetRole = currentPartnerId === 'p1' ? 'p2' : 'p1';
  const myRole = currentPartnerId === 'p2' ? 'p2' : 'p1';

  const targetPartner = partners[targetRole === 'p2' ? 'partner2' : 'partner1'] || {
    name: 'mi pareja',
    avatar: '🐻'
  };

  const myPartner = partners[myRole === 'p2' ? 'partner2' : 'partner1'] || {
    name: 'yo',
    avatar: '🌸'
  };

  // Base URL
  const baseUrl = window.location.origin + window.location.pathname;

  // Personalized link for the other partner
  const partnerInviteUrl = `${baseUrl}?space=${spaceId}&partner=${targetRole}`;

  // My own personal link
  const myPersonalUrl = `${baseUrl}?space=${spaceId}&partner=${myRole}`;

  // WhatsApp message pre-filled
  const whatsappMessage = `¡Hola mi amor! 💕 Creé nuestro nido en Cita Stay para que elijamos y votemos nuestros alojamientos juntos.\n\nToca aquí para entrar directamente como ${targetPartner.avatar} ${targetPartner.name}:\n${partnerInviteUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

  const copyToClipboard = (text, setFn) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ fontSize: '1.8rem' }}>💌</div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.35rem' }}>Invitar a tu Pareja</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {tripName || 'Nuestra Escapada Romántica'}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Highlight Box: Partner Exclusive Link */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 245, 247, 0.95), rgba(243, 232, 255, 0.95))',
          border: '2px solid var(--rose-300)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.35rem',
          marginBottom: '1.25rem',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem', fontWeight: 700, color: 'var(--rose-600)', fontSize: '0.92rem' }}>
            <span>{targetPartner.avatar}</span>
            <span>Enlace Exclusivo para {targetPartner.name}</span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', lineHeight: '1.4' }}>
            Al abrir este enlace en su celular o iPhone, entrará <strong>directamente con su propio perfil ({targetPartner.avatar} {targetPartner.name})</strong>. Podrá dar sus propios corazones y notas en tiempo real.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              type="text"
              readOnly
              value={partnerInviteUrl}
              className="form-input"
              style={{ fontSize: '0.82rem', background: 'white' }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => copyToClipboard(partnerInviteUrl, setCopiedPartner)}
              title="Copiar enlace de invitación"
            >
              {copiedPartner ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              <span>{copiedPartner ? '¡Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          {/* WhatsApp Direct Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              gap: '0.5rem',
              fontSize: '0.9rem'
            }}
          >
            <span>📲</span>
            <span>Enviar Invitación por WhatsApp a {targetPartner.name}</span>
          </a>
        </div>

        {/* My Own Access Link */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>{myPartner.avatar}</span>
              <span>Tu enlace personal ({myPartner.name})</span>
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Para tus marcadores</span>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              type="text"
              readOnly
              value={myPersonalUrl}
              className="form-input"
              style={{ fontSize: '0.78rem', background: 'white' }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => copyToClipboard(myPersonalUrl, setCopiedMine)}
              style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
            >
              {copiedMine ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
              <span>{copiedMine ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Room Code */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--rose-50)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--rose-200)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Código de Nido</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--rose-600)', letterSpacing: '0.05em' }}>
              {spaceId}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => copyToClipboard(spaceId, setCopiedCode)}
          >
            {copiedCode ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
            <span>{copiedCode ? '¡Copiado!' : 'Copiar Código'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
