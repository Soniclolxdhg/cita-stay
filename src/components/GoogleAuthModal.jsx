import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, Mail } from 'lucide-react';

export default function GoogleAuthModal({
  isOpen,
  onClose,
  onGoogleSuccess
}) {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Q7: Body scroll lock & U6: Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }

    setLoading(true);
    setError('');

    const cleanEmail = email.toLowerCase().trim();
    const displayName = (name || cleanEmail.split('@')[0]).trim();

    try {
      const res = await fetch('/api/auth/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: displayName,
          partnerName: partnerName.trim() || 'Mi Pareja'
        })
      });

      const data = await res.json();
      if (data.success && data.space) {
        if (data.token) {
          localStorage.setItem(`cita_token_${data.space.id}`, data.token);
        }
        onGoogleSuccess({
          googleUser: {
            email: cleanEmail,
            name: displayName
          },
          space: data.space
        });
        onClose();
      } else {
        setError(data.error || 'No se pudo conectar con este email.');
      }
    } catch (err) {
      console.warn('Backend unavailable, saving session offline:', err);
      // Offline fallback
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const offlineId = `AMOR-${randomDigits}`;
      const offlineSpace = {
        id: offlineId,
        name: `Nido de ${displayName} & ${partnerName.trim() || 'Mi Pareja'} 💕`,
        nights: 3,
        currency: 'CLP',
        ownerEmail: cleanEmail,
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

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 99999 }}
      role="dialog"
      aria-modal="true"
      aria-label="Acceso y Respaldo por Email"
    >
      <div className="modal-content" style={{ maxWidth: '440px', padding: '2rem 1.75rem', margin: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'var(--rose-100)',
              color: 'var(--rose-600)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-pill)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Mail size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Acceso por Email</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Guarda o recupera tu nido sin perder datos
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
          Ingresa tu correo para que tu nido y tus alojamientos queden <strong>respaldados</strong>. Podrás ingresar siempre desde cualquier dispositivo usando el mismo email.
        </p>

        {error && (
          <div className="auth-error-banner" style={{ marginBottom: '1rem' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tu Correo Electrónico *</label>
            <input
              type="email"
              placeholder="tu.correo@ejemplo.com"
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
            <label className="form-label">Nombre de tu Pareja (Opcional)</label>
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
              <span>Conectando...</span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                <span>Continuar y Respaldar Nido</span>
                <ArrowRight size={16} />
              </span>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
