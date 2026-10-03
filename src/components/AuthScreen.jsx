import React, { useState } from 'react';
import { Heart, Sparkles, Key, Users, ArrowRight, Check, Compass } from 'lucide-react';

const AVATARS_1 = ['🌸', '🦊', '🐱', '🐰', '🥑', '🌺', '✨', '🍓'];
const AVATARS_2 = ['🐻', '🦁', '🐨', '🐼', '🌿', '🌊', '🚀', '☕'];

export default function AuthScreen({
  initialSpaceId,
  onLoginSuccess,
  onExploreDemo
}) {
  const [mode, setMode] = useState(initialSpaceId && initialSpaceId !== 'AMOR-2026' ? 'join' : 'create');

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
          withExamples
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
        currency: 'USD',
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

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Ingresa el código del nido que te compartió tu pareja');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/join-space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: joinCode.trim(),
          pin: joinPin.trim(),
          partnerChoice: joinPartner
        })
      });

      const data = await res.json();
      if (data.success && data.space) {
        onLoginSuccess(data.space.id, joinPartner, data.space);
      } else {
        setError(data.error || 'Código incorrecto o espacio no encontrado');
      }
    } catch (err) {
      // Offline fallback
      onLoginSuccess(joinCode.trim().toUpperCase(), joinPartner);
    } finally {
      setLoading(false);
    }
  };

  return (
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

        {/* Tab switch */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'create' ? 'active' : ''}`}
            onClick={() => { setMode('create'); setError(''); }}
          >
            Crear Nuestro Nido
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'join' ? 'active' : ''}`}
            onClick={() => { setMode('join'); setError(''); }}
          >
            Tengo un Código / Unirme
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
              Pídele a tu pareja el <strong>Código de Nido</strong> (ej: <code>AMOR-7429</code>) o abre el link directo que te envió por WhatsApp.
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
              <span>{loading ? 'Verificando...' : 'Unirme a Nuestro Espacio 💕'}</span>
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
  );
}
