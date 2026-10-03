import React, { useState } from 'react';
import { X, Check, ArrowRight, ExternalLink, Key, Copy, Sparkles } from 'lucide-react';

export default function GoogleAuthModal({
  isOpen,
  onClose,
  onGoogleSuccess
}) {
  const [clientId, setClientId] = useState(() => {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem('cita_google_client_id') || '';
  });
  const [partnerName, setPartnerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showManual, setShowManual] = useState(false);

  // Manual fallback inputs
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');

  if (!isOpen) return null;

  const currentOrigin = window.location.origin;

  const handleCopyOrigin = () => {
    navigator.clipboard.writeText(currentOrigin);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleLaunchGooglePopup = (customClientId) => {
    const idToUse = (customClientId || clientId).trim();

    if (!idToUse) {
      setError('Por favor ingresa tu Google Client ID de Google Cloud Console.');
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      setError('El SDK oficial de Google aún se está cargando en la página. Espera 2 segundos y vuelve a presionar el botón.');
      return;
    }

    setLoading(true);
    setError('');

    // Save Client ID so they never have to type it again
    localStorage.setItem('cita_google_client_id', idToUse);

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: idToUse,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setLoading(false);
            if (tokenResponse.error === 'popup_closed_by_user') {
              setError('Cerraste la ventana de Google sin seleccionar una cuenta.');
            } else if (tokenResponse.error === 'access_denied') {
              setError('Acceso denegado en Google.');
            } else {
              setError(`Error de Google: ${tokenResponse.error_description || tokenResponse.error}`);
            }
            return;
          }

          try {
            // Fetch real verified user data from Google API
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            const profile = await res.json();

            if (profile.email) {
              await loginWithBackend({
                email: profile.email,
                name: profile.name || profile.given_name || profile.email.split('@')[0],
                picture: profile.picture,
                sub: profile.sub
              });
            } else {
              setError('No se pudo obtener el perfil de tu cuenta de Google.');
              setLoading(false);
            }
          } catch (fetchErr) {
            console.error('Error fetching Google profile:', fetchErr);
            setError('Error al conectar con la API de Google.');
            setLoading(false);
          }
        }
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      console.error('Error initializing Google client:', err);
      setError(`Error: ${err.message}. Verifica que tu Client ID sea correcto.`);
      setLoading(false);
    }
  };

  const loginWithBackend = async (googleUser) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: googleUser.email,
          name: googleUser.name,
          partnerName: partnerName.trim() || 'Mi Pareja',
          picture: googleUser.picture,
          sub: googleUser.sub
        })
      });

      const data = await res.json();
      if (data.success && data.space) {
        onGoogleSuccess({
          googleUser,
          space: data.space
        });
        onClose();
      } else {
        setError(data.error || 'No se pudo vincular la cuenta en el servidor.');
      }
    } catch (err) {
      // Offline fallback
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const offlineId = `AMOR-${randomDigits}`;
      const offlineSpace = {
        id: offlineId,
        name: `Nido de ${googleUser.name} & ${partnerName.trim() || 'Mi Pareja'} 💕`,
        nights: 3,
        currency: 'USD',
        googleOwner: googleUser,
        partners: {
          partner1: { id: 'p1', name: googleUser.name, avatar: '🌸', color: '#F472B6' },
          partner2: { id: 'p2', name: partnerName.trim() || 'Mi Pareja', avatar: '🐻', color: '#818CF8' }
        },
        accommodations: []
      };
      onGoogleSuccess({
        googleUser,
        space: offlineSpace
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualEmail.trim() || !manualEmail.includes('@')) {
      setError('Ingresa un correo electrónico válido');
      return;
    }
    setLoading(true);
    loginWithBackend({
      email: manualEmail.toLowerCase().trim(),
      name: (manualName || manualEmail.split('@')[0]).trim(),
      picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${manualEmail.trim()}`
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px', padding: '2rem 1.75rem' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <svg width="26" height="26" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.675-5.17 3.675-9.15z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.15C3.26 21.36 7.36 24 12 24z" />
              <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.39l4-3.15z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.27 6.61l4 3.15c.95-2.85 3.6-4.96 6.73-4.96z" />
            </svg>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Iniciar con la API de Google</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Google Identity Services OAuth 2.0
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="auth-error-banner" style={{ marginBottom: '1.25rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Primary Flow: Official Google OAuth API */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
            <Key size={15} color="#4285F4" />
            <span>Google Client ID de tu Proyecto de Google Cloud:</span>
          </label>
          <input
            type="text"
            placeholder="ej: 123456789-abc.apps.googleusercontent.com"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.82rem', fontFamily: 'monospace', marginBottom: '0.75rem', background: 'white' }}
          />

          <div className="form-group" style={{ marginBottom: '0.85rem' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Nombre de tu pareja (opcional):</label>
            <input
              type="text"
              placeholder="Ej: Valen, Nico, etc."
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.82rem', background: 'white' }}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', fontSize: '0.92rem' }}
            onClick={() => handleLaunchGooglePopup()}
            disabled={loading}
          >
            {loading ? (
              <span>Conectando con Google...</span>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#ffffff" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.675-5.17 3.675-9.15z" />
                  <path fill="#ffffff" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.15C3.26 21.36 7.36 24 12 24z" />
                  <path fill="#ffffff" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.39l4-3.15z" />
                  <path fill="#ffffff" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.27 6.61l4 3.15c.95-2.85 3.6-4.96 6.73-4.96z" />
                </svg>
                <span>Abrir Selector de Cuentas de Google 🚀</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Guide to get Google Client ID in 1 minute */}
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 'var(--radius-md)', padding: '0.9rem', fontSize: '0.8rem', color: '#1E40AF', marginBottom: '1rem', lineHeight: '1.45' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>¿Cómo obtener tu Google Client ID gratis?</span>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#2563EB', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}
            >
              Ir a Google Cloud <ExternalLink size={12} />
            </a>
          </div>
          <ol style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <li>En Google Cloud, ve a <strong>Credenciales ➔ Crear Credenciales ➔ ID de cliente OAuth</strong>.</li>
            <li>Tipo de aplicación: <strong>Aplicación Web</strong>.</li>
            <li>
              En <em>Orígenes de JavaScript autorizados</em>, agrega esta URL:
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                <code style={{ background: 'white', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #93C5FD', fontWeight: 700 }}>
                  {currentOrigin}
                </code>
                <button
                  type="button"
                  onClick={handleCopyOrigin}
                  style={{ background: 'white', border: '1px solid #93C5FD', borderRadius: '4px', padding: '0.15rem 0.4rem', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  {copiedUrl ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
                  <span>{copiedUrl ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </li>
            <li>Copia el <strong>ID de cliente</strong> generado y pégalo arriba. ¡Queda guardado para siempre en tu navegador!</li>
          </ol>
        </div>

        {/* Fallback to test without Google Cloud setup */}
        <div style={{ textAlign: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '0.85rem' }}>
          {!showManual ? (
            <button
              type="button"
              onClick={() => setShowManual(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', textDecoration: 'underline', cursor: 'pointer' }}
            >
              ¿Aún no tienes cuenta en Google Cloud? Entrar escribiendo correo
            </button>
          ) : (
            <form onSubmit={handleManualSubmit} style={{ textAlign: 'left', marginTop: '0.5rem' }}>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Correo Gmail:</label>
                <input
                  type="email"
                  placeholder="ejemplo@gmail.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.82rem' }}
                  required
                />
              </div>
              <button type="submit" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                Entrar Temporalmente
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
