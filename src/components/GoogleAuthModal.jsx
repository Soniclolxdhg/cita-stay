import React, { useState } from 'react';
import { X, Check, ArrowRight } from 'lucide-react';

export default function GoogleAuthModal({
  isOpen,
  onClose,
  onGoogleSuccess
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor ingresa un correo electrónico de Google válido');
      return;
    }

    setLoading(true);
    setError('');

    const cleanEmail = email.toLowerCase().trim();
    const displayName = (name || cleanEmail.split('@')[0]).trim();

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: displayName,
          partnerName: partnerName.trim() || 'Mi Pareja',
          picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`
        })
      });

      const data = await res.json();
      if (data.success && data.space) {
        onGoogleSuccess({
          googleUser: {
            email: cleanEmail,
            name: displayName,
            picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`
          },
          space: data.space
        });
        onClose();
      } else {
        setError(data.error || 'No se pudo iniciar sesión con Google.');
      }
    } catch (err) {
      console.warn('Backend unavailable, saving Google session offline:', err);
      // Offline fallback
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const offlineId = `AMOR-${randomDigits}`;
      const offlineSpace = {
        id: offlineId,
        name: `Nido de ${displayName} & ${partnerName.trim() || 'Mi Pareja'} 💕`,
        nights: 3,
        currency: 'USD',
        googleOwner: { email: cleanEmail, name: displayName },
        partners: {
          partner1: { id: 'p1', name: displayName, avatar: '🌸', color: '#F472B6' },
          partner2: { id: 'p2', name: partnerName.trim() || 'Mi Pareja', avatar: '🐻', color: '#818CF8' }
        },
        accommodations: []
      };

      onGoogleSuccess({
        googleUser: { email: cleanEmail, name: displayName },
        space: offlineSpace
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '440px', padding: '2rem 1.75rem' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Official Google G Logo */}
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.675-5.17 3.675-9.15z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.15C3.26 21.36 7.36 24 12 24z" />
              <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.39l4-3.15z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.27 6.61l4 3.15c.95-2.85 3.6-4.96 6.73-4.96z" />
            </svg>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Iniciar con Google</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
          Vincula tu cuenta de Google para que tu nido y tus alojamientos queden <strong>guardados permanentemente</strong> y puedas acceder siempre desde cualquier celular o PC.
        </p>

        {error && (
          <div className="auth-error-banner" style={{ marginBottom: '1rem' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tu Correo de Google / Gmail *</label>
            <input
              type="email"
              placeholder="tu.correo@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tu Nombre (o cómo te dice tu pareja)</label>
            <input
              type="text"
              placeholder="Ej: Lucas, Cami, Sofi..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nombre de tu Pareja</label>
            <input
              type="text"
              placeholder="Ej: Valen, Nico, etc."
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              className="form-input"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.8rem' }}
            disabled={loading}
          >
            {loading ? (
              <span>Vinculando con Google...</span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                <span>Continuar y Guardar en mi Cuenta</span>
                <ArrowRight size={16} />
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
