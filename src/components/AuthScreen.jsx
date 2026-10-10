import React, { useState } from 'react';
import { Sparkles, ArrowRight, Compass, Lock, UserPlus, LogIn, Heart } from 'lucide-react';

const AVATARS_1 = ['🌸', '🦊', '🐱', '🐰', '🥑', '🌺', '✨', '🍓'];
const AVATARS_2 = ['🐻', '🦁', '🐨', '🐼', '🌿', '🌊', '🚀', '☕'];

export default function AuthScreen({
  initialSpaceId,
  onLoginSuccess,
  onExploreDemo
}) {
  // Modes: 'login' | 'create' | 'join' | 'code'
  const [mode, setMode] = useState(() => {
    if (initialSpaceId && initialSpaceId !== 'AMOR-2026') return 'join';
    return 'login';
  });

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Partner 1 state (Creating space)
  const [p1Name, setP1Name] = useState('');
  const [p1Avatar, setP1Avatar] = useState('🌸');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [p2Name, setP2Name] = useState('');
  const [p2Avatar, setP2Avatar] = useState('🐻');
  const [tripName, setTripName] = useState('');
  const [withExamples, setWithExamples] = useState(false);

  // Register Partner 2 state (Joining partner space)
  const [joinCode, setJoinCode] = useState(initialSpaceId || '');
  const [partnerJoinName, setPartnerJoinName] = useState('');
  const [partnerJoinAvatar, setPartnerJoinAvatar] = useState('🐻');
  const [partnerJoinEmail, setPartnerJoinEmail] = useState('');
  const [partnerJoinPassword, setPartnerJoinPassword] = useState('');
  const [joinPin, setJoinPin] = useState('');

  // Code-only fallback
  const [joinPartner, setJoinPartner] = useState('p2');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Login with Email + Password
  const handleLoginUser = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Por favor ingresa tu correo y contraseña');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.space) {
        if (data.token) {
          localStorage.setItem(`cita_token_${data.space.id}`, data.token);
        }
        if (data.user) {
          localStorage.setItem('cita_user', JSON.stringify(data.user));
        }
        onLoginSuccess(data.space.id, data.partnerRole || 'p1', data.space);
      } else {
        setError(data.error || 'Correo o contraseña incorrectos');
      }
    } catch {
      setError('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Partner 1 Register (Creates couple space)
  const handleRegisterCouple = async (e) => {
    e.preventDefault();
    if (!p1Name.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }
    if (!registerEmail.trim() || !registerPassword.trim()) {
      setError('Por favor ingresa tu correo y una contraseña');
      return;
    }
    if (registerPassword.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register-couple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: p1Name.trim(),
          avatar: p1Avatar,
          email: registerEmail.trim(),
          password: registerPassword,
          partnerName: p2Name.trim() || 'Mi Pareja',
          partnerAvatar: p2Avatar,
          tripName: tripName.trim() || `Escapada de ${p1Name.trim()} & ${p2Name.trim() || 'Pareja'} 💕`,
          currency: 'CLP',
          withExamples
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.space) {
        if (data.token) {
          localStorage.setItem(`cita_token_${data.space.id}`, data.token);
        }
        if (data.user) {
          localStorage.setItem('cita_user', JSON.stringify(data.user));
        }
        onLoginSuccess(data.space.id, 'p1', data.space);
      } else {
        setError(data.error || 'Error al crear la cuenta');
      }
    } catch {
      setError('Error de conexión al registrar. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Partner 2 Register (Joins partner's space with own separate credentials)
  const handleRegisterPartner = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Ingresa el código del nido que te compartió tu pareja');
      return;
    }
    if (!partnerJoinName.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }
    if (!partnerJoinEmail.trim() || !partnerJoinPassword.trim()) {
      setError('Ingresa tu correo y contraseña');
      return;
    }
    if (partnerJoinPassword.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register-partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: joinCode.trim(),
          name: partnerJoinName.trim(),
          avatar: partnerJoinAvatar,
          email: partnerJoinEmail.trim(),
          password: partnerJoinPassword,
          pin: joinPin.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.space) {
        if (data.token) {
          localStorage.setItem(`cita_token_${data.space.id}`, data.token);
        }
        if (data.user) {
          localStorage.setItem('cita_user', JSON.stringify(data.user));
        }
        onLoginSuccess(data.space.id, 'p2', data.space);
      } else {
        setError(data.error || 'Error al unirte al nido');
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Quick Code Access (Fallback & demo)
  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Ingresa el código de tu nido (ej: AMOR-2026)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanCode = joinCode.trim().toUpperCase();
      const res = await fetch('/api/auth/join-space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: cleanCode,
          partnerChoice: joinPartner,
          pin: joinPin.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.space) {
        if (data.token) {
          localStorage.setItem(`cita_token_${data.space.id}`, data.token);
        }
        onLoginSuccess(data.space.id, data.partnerId || joinPartner, data.space);
      } else {
        setError(data.error || 'No se pudo acceder con ese código');
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Saved spaces found in localStorage
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
    } catch {}
    return list;
  }, []);

  return (
    <div className="auth-wrapper auth-overlay">
      <div className="auth-card">
        {/* Brand header */}
        <div className="auth-header">
          <div className="auth-logo-badge">
            <Heart size={28} color="var(--rose-500)" fill="var(--rose-200)" />
          </div>
          <h1>Cita Stay 💕</h1>
          <p className="auth-subtitle">
            Cuentas individuales para cada uno, un solo nido compartido para soñar juntos.
          </p>
        </div>

        {/* Tab switch */}
        <div className="auth-tabs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
          >
            <LogIn size={14} style={{ marginRight: '0.3rem' }} /> Iniciar Sesión
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'create' ? 'active' : ''}`}
            onClick={() => { setMode('create'); setError(''); setSuccessMsg(''); }}
          >
            <Sparkles size={14} style={{ marginRight: '0.3rem' }} /> Crear Nido
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'join' ? 'active' : ''}`}
            onClick={() => { setMode('join'); setError(''); setSuccessMsg(''); }}
          >
            <UserPlus size={14} style={{ marginRight: '0.3rem' }} /> Unirme
          </button>
        </div>

        {error && (
          <div className="auth-error-banner" style={{ marginBottom: '1.2rem' }}>
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div style={{ background: '#F0FDF4', color: '#166534', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.2rem', fontSize: '0.85rem' }}>
            ✓ {successMsg}
          </div>
        )}

        {/* 1. LOGIN MODE */}
        {mode === 'login' && (
          <form onSubmit={handleLoginUser} className="auth-form">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.4' }}>
              Inicia sesión con tu cuenta personal para ver todos los alojamientos que tú y tu pareja han guardado.
            </p>

            <div className="form-group">
              <label className="form-label">Tu Correo Electrónico *</label>
              <input
                type="email"
                placeholder="ej: tu.email@gmail.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tu Contraseña *</label>
              <input
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ marginTop: '0.5rem', width: '100%', padding: '0.85rem' }}
            >
              <LogIn size={16} />
              <span>{loading ? 'Iniciando Sesión...' : 'Entrar a Mi Nido 💕'}</span>
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              ¿Aún no tienen un nido?{' '}
              <button
                type="button"
                onClick={() => setMode('create')}
                style={{ color: 'var(--rose-600)', fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Crea uno aquí
              </button>
            </div>
          </form>
        )}

        {/* 2. CREATE COUPLE SPACE (PARTNER 1) */}
        {mode === 'create' && (
          <form onSubmit={handleRegisterCouple} className="auth-form">
            <div style={{ background: 'var(--rose-50)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--rose-700)' }}>
              Crearás tu propia cuenta y el nido compartido. Luego le enviaremos el enlace a tu pareja para que cree su cuenta y se una.
            </div>

            {/* Partner 1 Info */}
            <div className="auth-section-box">
              <label className="form-label" style={{ color: 'var(--rose-600)' }}>
                1. Tus Datos Personales (Pareja 1)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem' }}>
                <input
                  type="text"
                  placeholder="Tu nombre (ej: Lucas)"
                  value={p1Name}
                  onChange={(e) => setP1Name(e.target.value)}
                  className="form-input"
                  required
                />
                <span style={{ fontSize: '1.4rem' }}>{p1Avatar}</span>
              </div>
              <div className="avatar-picker-mini" style={{ marginBottom: '0.75rem' }}>
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

              <input
                type="email"
                placeholder="Tu correo electrónico *"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                className="form-input"
                style={{ marginBottom: '0.6rem' }}
                required
              />
              <input
                type="password"
                placeholder="Crea tu contraseña (mínimo 4 caracteres) *"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                className="form-input"
                required
              />
            </div>

            {/* Partner 2 Info */}
            <div className="auth-section-box">
              <label className="form-label" style={{ color: 'var(--lavender-500)' }}>
                2. ¿Cómo se llama tu pareja?
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                <input
                  type="text"
                  placeholder="Nombre de tu pareja (ej: Romina)"
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

            {/* Trip Name */}
            <div className="form-group">
              <label className="form-label">Nombre del Viaje / Escapada (Opcional)</label>
              <input
                type="text"
                placeholder="Ej: Nuestra Luna de Miel, Bariloche 2026..."
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="auth-checkbox-box">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={withExamples}
                  onChange={(e) => setWithExamples(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--rose-500)' }}
                />
                <span>Cargar ejemplos románticos de demostración</span>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ marginTop: '0.5rem', width: '100%', padding: '0.85rem' }}
            >
              <Sparkles size={16} />
              <span>{loading ? 'Creando Tu Cuenta y Espacio...' : 'Crear Cuenta & Comenzar Viaje 💕'}</span>
            </button>
          </form>
        )}

        {/* 3. JOIN PARTNER (PARTNER 2) */}
        {mode === 'join' && (
          <form onSubmit={handleRegisterPartner} className="auth-form">
            <div style={{ background: '#EEF2FF', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.82rem', color: '#3730A3' }}>
              Crearás tu propia cuenta como Pareja 2 para conectarte directamente al nido de tu pareja.
            </div>

            <div className="form-group">
              <label className="form-label">Código del Nido de tu Pareja *</label>
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

            <div className="auth-section-box">
              <label className="form-label" style={{ color: 'var(--lavender-500)' }}>
                Tus Datos de Cuenta (Pareja 2)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem' }}>
                <input
                  type="text"
                  placeholder="Tu nombre (ej: Romina)"
                  value={partnerJoinName}
                  onChange={(e) => setPartnerJoinName(e.target.value)}
                  className="form-input"
                  required
                />
                <span style={{ fontSize: '1.4rem' }}>{partnerJoinAvatar}</span>
              </div>
              <div className="avatar-picker-mini" style={{ marginBottom: '0.75rem' }}>
                {AVATARS_2.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setPartnerJoinAvatar(av)}
                    className={`avatar-chip ${partnerJoinAvatar === av ? 'active' : ''}`}
                  >
                    {av}
                  </button>
                ))}
              </div>

              <input
                type="email"
                placeholder="Tu correo electrónico *"
                value={partnerJoinEmail}
                onChange={(e) => setPartnerJoinEmail(e.target.value)}
                className="form-input"
                style={{ marginBottom: '0.6rem' }}
                required
              />
              <input
                type="password"
                placeholder="Crea tu contraseña *"
                value={partnerJoinPassword}
                onChange={(e) => setPartnerJoinPassword(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">PIN secreto (si tu pareja configuró uno)</label>
              <input
                type="password"
                placeholder="Opcional"
                value={joinPin}
                onChange={(e) => setJoinPin(e.target.value)}
                className="form-input"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ marginTop: '0.5rem', width: '100%', padding: '0.85rem' }}
            >
              <UserPlus size={16} />
              <span>{loading ? 'Creando Cuenta y Vinculando...' : 'Crear Mi Cuenta & Unirme 💕'}</span>
            </button>
          </form>
        )}

        {/* 4. CODE-ONLY FALLBACK */}
        {mode === 'code' && (
          <form onSubmit={handleJoinByCode} className="auth-form">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Entra directamente usando únicamente el código de tu nido (modo sin contraseña).
            </p>

            <div className="form-group">
              <label className="form-label">Código del Nido *</label>
              <input
                type="text"
                placeholder="Ej: AMOR-2026"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="form-input"
                style={{ textTransform: 'uppercase', fontWeight: 700 }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">¿Entrar como quién?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setJoinPartner('p1')}
                  className={`partner-select-btn ${joinPartner === 'p1' ? 'active' : ''}`}
                >
                  <span>🌸</span>
                  <span>Pareja 1</span>
                </button>
                <button
                  type="button"
                  onClick={() => setJoinPartner('p2')}
                  className={`partner-select-btn ${joinPartner === 'p2' ? 'active' : ''}`}
                >
                  <span>🐻</span>
                  <span>Pareja 2</span>
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
              style={{ marginTop: '0.5rem', width: '100%', padding: '0.85rem' }}
            >
              <ArrowRight size={16} />
              <span>{loading ? 'Entrando...' : 'Entrar con Código 💕'}</span>
            </button>
          </form>
        )}

        {/* Saved Spaces shortcuts */}
        {savedSpaces.length > 0 && mode !== 'code' && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Nidos recordados en este dispositivo:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {savedSpaces.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--rose-100)',
                    fontSize: '0.8rem'
                  }}
                >
                  <div>
                    <strong>{s.name || s.id}</strong>{' '}
                    <span style={{ color: 'var(--text-muted)' }}>({s.id})</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onLoginSuccess(s.id, 'p1', s)}
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  >
                    Abrir
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer shortcuts */}
        <div className="auth-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)', fontSize: '0.78rem' }}>
          <button
            type="button"
            className="auth-demo-link"
            onClick={onExploreDemo}
          >
            <Compass size={14} />
            <span>Probar Demo Rápida</span>
          </button>

          {mode !== 'code' ? (
            <button
              type="button"
              onClick={() => { setMode('code'); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Lock size={12} />
              <span>Entrar solo con código</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--rose-600)', cursor: 'pointer', fontWeight: 600 }}
            >
              Volver a Iniciar Sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
