import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, Key, Users, ArrowRight, Check, Compass } from 'lucide-react';
import GoogleAuthModal from './GoogleAuthModal';

const AVATARS_1 = ['🌸', '🦊', '🐱', '🐰', '🥑', '🌺', '✨', '🍓'];
const AVATARS_2 = ['🐻', '🦁', '🐨', '🐼', '🌿', '🌊', '🚀', '☕'];

export default function AuthScreen({
  initialSpaceId,
  onLoginSuccess,
  onExploreDemo
}) {
  const [mode, setMode] = useState(initialSpaceId && initialSpaceId !== 'AMOR-2026' ? 'join' : 'create');
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // Create form state
  const [p1Name, setP1Name] = useState('');
  const [p1Avatar, setP1Avatar] = useState('🌸');
  const [p2Name, setP2Name] = useState('');
  const [p2Avatar, setP2Avatar] = useState('🐻');
  const [tripName, setTripName] = useState('');
  const [pin, setPin] = useState('');
  const [withExamples, setWithExamples] = useState(false); // Default: Empty list, clean for real use!

  // Join form state
  const [joinCode, setJoinCode] = useState(initialSpaceId || '');
  const [joinPin, setJoinPin] = useState('');
  const [joinPartner, setJoinPartner] = useState('p2');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!p1Name.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/create-space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tripName.trim() || `Escapada de ${p1Name.trim()} & ${p2Name.trim() || 'Pareja'} 💕`,
          p1Name: p1Name.trim(),
          p1Avatar,
          p2Name: p2Name.trim() || 'Mi Pareja',
          p2Avatar,
          pin: pin.trim(),
          withExamples,
          currency: 'CLP'
        })
      });

      const data = await res.json();
      if (data.success && data.space) {
        onLoginSuccess(data.space.id, 'p1', data.space);
      } else {
        setError(data.error || 'Error al crear el espacio');
      }
    } catch (err) {
      console.warn('Backend unavailable, creating space offline:', err);
      // Offline / Static fallback
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const offlineId = `AMOR-${randomDigits}`;
      const offlineSpace = {
        id: offlineId,
        name: tripName.trim() || `Escapada de ${p1Name.trim()} & ${p2Name.trim() || 'Pareja'} 💕`,
        nights: 3,
        currency: 'CLP',
        partners: {
          partner1: { id: 'p1', name: p1Name.trim(), avatar: p1Avatar, color: '#F472B6' },
          partner2: { id: 'p2', name: p2Name.trim() || 'Mi Pareja', avatar: p2Avatar, color: '#818CF8' }
        },
        accommodations: []
      };
      onLoginSuccess(offlineId, 'p1', offlineSpace);
    } finally {
      setLoading(false);
    }
  };

  // Find any previously created/visited spaces on this device
  const savedSpaces = React.useMemo(() => {
    const list = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cita_cache_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.id && parsed.id !== 'AMOR-2026') {
              if (!list.some((item) => item.id === parsed.id)) {
                list.push(parsed);
              }
            }
          }
        }
      }
    } catch (_) {}
    return list;
  }, []);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Ingresa el código de tu nido (ej: AMOR-2026)');
      return;
    }

    setLoading(true);
    setError('');

    const cleanCode = joinCode.trim().toUpperCase();

    // 1. Check local cache first so device memory is prioritized
    let localData = null;
    try {
      const cached = localStorage.getItem(`cita_cache_${cleanCode}`);
      if (cached) localData = JSON.parse(cached);
    } catch (_) {}

    try {
      const res = await fetch('/api/auth/join-space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: cleanCode,
          pin: joinPin.trim(),
          partnerChoice: joinPartner
        })
      });

      const data = await res.json();
      if (data.success && data.space) {
        // If local copy has more accommodations, prefer local
        const finalSpace = (localData && (localData.accommodations?.length || 0) > (data.space.accommodations?.length || 0))
          ? localData
          : data.space;
        onLoginSuccess(finalSpace.id, joinPartner, finalSpace);
        return;
      }
    } catch (err) {
      console.warn('Network issue during join:', err);
    }

    // 2. If server was idle/fresh but we have it locally, log in immediately!
    if (localData) {
      onLoginSuccess(cleanCode, joinPartner, localData);
      return;
    }

    // 3. Fallback: connect to this code so user is never locked out
    const fallbackSpace = {
      id: cleanCode,
      name: `Nido ${cleanCode} 💕`,
      nights: 3,
      currency: 'CLP',
      partners: {
        partner1: { id: 'p1', name: 'Pareja 1', avatar: '🌸', color: '#F472B6' },
        partner2: { id: 'p2', name: 'Pareja 2', avatar: '🐻', color: '#818CF8' }
      },
      accommodations: []
    };
    onLoginSuccess(cleanCode, joinPartner, fallbackSpace);
  };

  return (
    <>
      <div className="auth-overlay">
        <div className="auth-card">
          {/* Logo and title */}
          <div className="auth-brand">
          <div className="auth-icon-badge">💕</div>
          <h1 className="font-serif">Cita <span>Stay</span></h1>
          <p className="auth-subtitle">
            El comparador romántico y privado para viajar de a dos
          </p>
        </div>

        {/* Saved Spaces on this device */}
        {savedSpaces.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(254, 242, 242, 0.95), rgba(250, 245, 255, 0.95))',
            border: '2px solid var(--rose-200)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            marginBottom: '1.25rem',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--rose-600)', marginBottom: '0.65rem' }}>
              <Sparkles size={15} />
              <span>Tus Nidos Guardados en este dispositivo:</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {savedSpaces.map((s) => (
                <div key={s.id} style={{
                  background: 'white',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-subtle)',
                  border: '1px solid var(--rose-100)',
                  gap: '0.5rem'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.name || 'Nuestra Escapada'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      Código: <strong style={{ color: 'var(--rose-600)' }}>{s.id}</strong> • {s.accommodations?.length || 0} lugares • {s.partners?.partner1?.name || 'Pareja 1'} & {s.partners?.partner2?.name || 'Pareja 2'}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onLoginSuccess(s.id, 'p1', s)}
                    style={{ whiteSpace: 'nowrap', flexShrink: 0, padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    Entrar 💕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Google One-Click Login Button */}
        <button
          type="button"
          className="btn-google-sign-in"
          onClick={() => setIsGoogleModalOpen(true)}
          title="Iniciar sesión y guardar con tu cuenta de Google"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.675-5.17 3.675-9.15z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.15C3.26 21.36 7.36 24 12 24z" />
            <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.39l4-3.15z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.27 6.61l4 3.15c.95-2.85 3.6-4.96 6.73-4.96z" />
          </svg>
          <span>Continuar con Google</span>
        </button>

        <div className="auth-divider">
          <span>o acceder con código privado</span>
        </div>

        {/* Tab switch */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'create' ? 'active' : ''}`}
            onClick={() => { setMode('create'); setError(''); }}
          >
            Crear Nuevo Nido
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'join' ? 'active' : ''}`}
            onClick={() => { setMode('join'); setError(''); }}
          >
            Ya Tengo un Código / Iniciar Sesión
          </button>
        </div>

        {error && (
          <div className="auth-error-banner">
            ⚠️ {error}
          </div>
        )}

        {/* CREATE TAB */}
        {mode === 'create' && (
          <form onSubmit={handleCreate} className="auth-form">
            {/* Partner 1 (User) */}
            <div className="auth-section-box">
              <label className="form-label" style={{ color: 'var(--rose-600)' }}>
                1. ¿Cómo te llamas tú? *
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                <input
                  type="text"
                  placeholder="Tu nombre (ej: Lucas, Cami, Sofi)"
                  value={p1Name}
                  onChange={(e) => setP1Name(e.target.value)}
                  className="form-input"
                  required
                />
                <span style={{ fontSize: '1.4rem' }}>{p1Avatar}</span>
              </div>
              <div className="avatar-picker-mini">
                {AVATARS_1.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setP1Avatar(av)}
                    className={`avatar-chip ${p1Avatar === av ? 'active' : ''}`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Partner 2 (The couple) */}
            <div className="auth-section-box">
              <label className="form-label" style={{ color: 'var(--lavender-500)' }}>
                2. ¿Cómo se llama tu pareja?
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                <input
                  type="text"
                  placeholder="Nombre de tu pareja"
                  value={p2Name}
                  onChange={(e) => setP2Name(e.target.value)}
                  className="form-input"
                />
                <span style={{ fontSize: '1.4rem' }}>{p2Avatar}</span>
              </div>
              <div className="avatar-picker-mini">
                {AVATARS_2.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setP2Avatar(av)}
                    className={`avatar-chip ${p2Avatar === av ? 'active' : ''}`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Trip Name & PIN */}
            <div className="form-group">
              <label className="form-label">Nombre del viaje (Opcional)</label>
              <input
                type="text"
                placeholder="Ej: Nuestra Escapada Romántica, Bariloche 2026..."
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">PIN secreto de 4 dígitos (Opcional)</label>
              <input
                type="password"
                maxLength="6"
                placeholder="Ej: 1234 (opcional, para mayor privacidad)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Empty list vs demo toggle */}
            <div className="auth-checkbox-box">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={withExamples}
                  onChange={(e) => setWithExamples(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--rose-500)' }}
                />
                <span>Cargar 3 alojamientos de demostración (desmarca para empezar con tu lista limpia)</span>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ marginTop: '1rem', width: '100%', padding: '0.85rem' }}
            >
              <Sparkles size={16} />
              <span>{loading ? 'Creando Nido...' : 'Entrar y Comenzar Nuestro Viaje 💕'}</span>
            </button>
          </form>
        )}

        {/* JOIN TAB */}
        {mode === 'join' && (
          <form onSubmit={handleJoin} className="auth-form">
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Ingresa el <strong>Código de tu Nido</strong> (ej: <code>AMOR-7429</code>) para reanudar tu sesión o sincronizarte con tu pareja.
            </p>

            <div className="form-group">
              <label className="form-label">Código del Nido *</label>
              <input
                type="text"
                placeholder="Ej: AMOR-2026"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="form-input"
                style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">¿Quién eres tú al entrar?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setJoinPartner('p1')}
                  className={`partner-select-btn ${joinPartner === 'p1' ? 'active' : ''}`}
                >
                  <span>🌸</span>
                  <span>Pareja 1 (Creador/a)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setJoinPartner('p2')}
                  className={`partner-select-btn ${joinPartner === 'p2' ? 'active' : ''}`}
                >
                  <span>🐻</span>
                  <span>Pareja 2 (Invitado/a)</span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">PIN de Pareja (si configuraron uno)</label>
              <input
                type="password"
                placeholder="PIN de 4 dígitos"
                value={joinPin}
                onChange={(e) => setJoinPin(e.target.value)}
                className="form-input"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ marginTop: '1rem', width: '100%', padding: '0.85rem' }}
            >
              <ArrowRight size={16} />
              <span>{loading ? 'Accediendo...' : 'Iniciar Sesión / Entrar a Nuestro Espacio 💕'}</span>
            </button>
          </form>
        )}

        {/* Demo Footer option */}
        <div className="auth-footer">
          <button
            type="button"
            className="auth-demo-link"
            onClick={onExploreDemo}
          >
            <Compass size={14} />
            <span>O probar versión de demostración rápida</span>
          </button>
        </div>
      </div>
    </div>

    {/* Google Auth Modal rendered outside card for perfect centering */}
    <GoogleAuthModal
      isOpen={isGoogleModalOpen}
      onClose={() => setIsGoogleModalOpen(false)}
      onGoogleSuccess={(data) => {
        onLoginSuccess(data.space.id, 'p1', data.space);
      }}
    />
  </>
);
}
