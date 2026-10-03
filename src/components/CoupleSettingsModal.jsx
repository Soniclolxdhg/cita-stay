import React, { useState } from 'react';
import { X, Users, Copy, Check, Share2, Sparkles, Key, Smartphone } from 'lucide-react';

import GoogleAuthModal from './GoogleAuthModal';

const AVATARS_P1 = ['🌸', '🦊', '🐱', '🐰', '🥑', '🌺', '✨', '🍓'];
const AVATARS_P2 = ['🐻', '🦁', '🐨', '🐼', '🌿', '🌊', '🚀', '☕'];

export default function CoupleSettingsModal({
  isOpen,
  onClose,
  spaceId,
  tripName,
  partners,
  currentPartnerId = 'p1',
  onUpdateTrip,
  apiKey,
  onUpdateApiKey,
  googleOwner,
  onLinkGoogle
}) {
  const [localTripName, setLocalTripName] = useState(tripName || '');
  const [p1Name, setP1Name] = useState(partners.partner1?.name || 'Cami');
  const [p1Avatar, setP1Avatar] = useState(partners.partner1?.avatar || '🌸');
  const [p2Name, setP2Name] = useState(partners.partner2?.name || 'Nico');
  const [p2Avatar, setP2Avatar] = useState(partners.partner2?.avatar || '🐻');
  const [localKey, setLocalKey] = useState(apiKey || '');
  const [copied, setCopied] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  if (!isOpen) return null;

  const targetRole = currentPartnerId === 'p1' ? 'p2' : 'p1';
  const targetPartnerName = partners[targetRole === 'p2' ? 'partner2' : 'partner1']?.name || 'tu pareja';
  const targetPartnerAvatar = partners[targetRole === 'p2' ? 'partner2' : 'partner1']?.avatar || '💌';

  const baseUrl = window.location.origin + window.location.pathname;
  const partnerShareUrl = `${baseUrl}?space=${spaceId}&partner=${targetRole}`;

  const whatsappMsg = `¡Hola mi amor! 💕 Creé nuestro nido en Cita Stay para que elijamos y votemos nuestros alojamientos juntos.\n\nToca aquí para entrar directamente como ${targetPartnerAvatar} ${targetPartnerName}:\n${partnerShareUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMsg)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(partnerShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = (e) => {
    e.preventDefault();
    onUpdateTrip({
      name: localTripName,
      partners: {
        partner1: { id: 'p1', name: p1Name.trim(), avatar: p1Avatar, color: '#F472B6' },
        partner2: { id: 'p2', name: p2Name.trim(), avatar: p2Avatar, color: '#818CF8' }
      }
    });

    if (onUpdateApiKey) {
      onUpdateApiKey(localKey.trim());
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <span>⚙️</span>
            <span>Espacio de Pareja & Conexión</span>
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Share Link Banner */}
        <div style={{ background: 'var(--rose-50)', border: '1px solid var(--rose-200)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--rose-600)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Share2 size={16} /> Enlace Exclusivo para {targetPartnerAvatar} {targetPartnerName}
            </span>
            <span style={{ fontSize: '0.78rem', background: 'white', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--rose-200)', fontWeight: 600 }}>
              Código: {spaceId}
            </span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
            Al entrar con este enlace, tu pareja entrará <strong>directamente con su propio perfil ({targetPartnerAvatar} {targetPartnerName})</strong> y no como invitado genérico:
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              type="text"
              readOnly
              value={partnerShareUrl}
              className="form-input"
              style={{ fontSize: '0.8rem', background: 'white' }}
            />
            <button className="btn btn-secondary btn-sm" onClick={handleCopyLink}>
              {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
            style={{ width: '100%', background: 'linear-gradient(135deg, #10B981, #059669)', fontSize: '0.85rem' }}
          >
            <span>📲</span> Enviar Invitación por WhatsApp a {targetPartnerName}
          </a>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Nombre del Viaje / Escapada</label>
            <input
              type="text"
              value={localTripName}
              onChange={(e) => setLocalTripName(e.target.value)}
              placeholder="Ej: Nuestra Escapada Romántica 💕"
              className="form-input"
            />
          </div>

          {/* Partner 1 config */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem' }}>
            <label className="form-label" style={{ color: 'var(--rose-600)' }}>
              Pareja 1 (🌸)
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              <input
                type="text"
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                placeholder="Nombre de ella o él"
                className="form-input"
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '1.5rem', padding: '0 0.5rem' }}>{p1Avatar}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {AVATARS_P1.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setP1Avatar(av)}
                  style={{
                    background: p1Avatar === av ? 'var(--rose-200)' : 'white',
                    border: '1px solid var(--rose-200)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    fontSize: '1.1rem',
                    cursor: 'pointer'
                  }}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Partner 2 config */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ color: 'var(--lavender-500)' }}>
              Pareja 2 (🐻)
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              <input
                type="text"
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                placeholder="Nombre de tu pareja"
                className="form-input"
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '1.5rem', padding: '0 0.5rem' }}>{p2Avatar}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {AVATARS_P2.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setP2Avatar(av)}
                  style={{
                    background: p2Avatar === av ? 'var(--lavender-200)' : 'white',
                    border: '1px solid var(--lavender-200)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    fontSize: '1.1rem',
                    cursor: 'pointer'
                  }}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Gemini API Key */}
          <div className="form-group" style={{ borderTop: '1px dashed var(--border-soft)', paddingTop: '1rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Key size={14} color="#A855F7" />
              <span>Gemini API Key (Opcional)</span>
            </label>
            <input
              type="password"
              placeholder="AIzaSy... (Opcional - la app ya incluye IA integrada)"
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.82rem' }}
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '0.3rem' }}>
              Si tienes tu propia clave de Google AI Studio puedes pegarla aquí para análisis aún más profundos.
            </small>
          </div>

          {/* Google Account Status / Link */}
          {googleOwner?.email ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#166534' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.675-5.17 3.675-9.15z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.15C3.26 21.36 7.36 24 12 24z" />
                <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.39l4-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.27 6.61l4 3.15c.95-2.85 3.6-4.96 6.73-4.96z" />
              </svg>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Guardado con Google</div>
                <div style={{ color: '#15803D', fontSize: '0.78rem' }}>{googleOwner.email}</div>
              </div>
              <span style={{ fontSize: '0.75rem', background: '#DCFCE7', color: '#166534', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-pill)', fontWeight: 600 }}>
                Protegido ✓
              </span>
            </div>
          ) : (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.675-5.17 3.675-9.15z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.15C3.26 21.36 7.36 24 12 24z" />
                  <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.39l4-3.15z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.27 6.61l4 3.15c.95-2.85 3.6-4.96 6.73-4.96z" />
                </svg>
                <span>Vincular con Google para no perder tus datos</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsGoogleModalOpen(true)}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap' }}
              >
                Vincular
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cerrar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar Cambios 💕
            </button>
          </div>
        </form>

        {/* Google Link Modal */}
        <GoogleAuthModal
          isOpen={isGoogleModalOpen}
          onClose={() => setIsGoogleModalOpen(false)}
          onGoogleSuccess={(data) => {
            if (onLinkGoogle) {
              onLinkGoogle(data.googleUser);
            }
          }}
        />
      </div>
    </div>
  );
}
