import React, { useState } from 'react';
import { Heart, Sparkles, Plus, Users, Share2, Copy, Check, Settings, LogOut } from 'lucide-react';

export default function Header({
  spaceId,
  partners,
  currentPartnerId,
  onSwitchPartner,
  onOpenAddModal,
  onOpenAiModal,
  onOpenSettingsModal,
  accommodationsCount,
  matchesCount,
  onLogout
}) {
  const [copied, setCopied] = useState(false);
  const currentPartner = partners[currentPartnerId === 'p2' ? 'partner2' : 'partner1'] || {
    name: 'Pareja',
    avatar: '🌸'
  };

  const otherPartner = partners[currentPartnerId === 'p2' ? 'partner1' : 'partner2'] || {
    name: 'Pareja 2',
    avatar: '🐻'
  };

  const handleCopyLink = () => {
    const fullUrl = window.location.origin + window.location.pathname + '?space=' + spaceId;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <header className="main-header">
      <div className="logo-area">
        <div className="logo-badge" title="Cita Stay - Alojamientos en Pareja">
          💕
        </div>
        <div className="logo-text">
          <h1>Cita <span>Stay</span></h1>
          <div className="logo-subtitle">Comparador romántico para viajar juntos</div>
        </div>
      </div>

      <div className="header-actions">
        {/* Share Space / Room Code Pill */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleCopyLink}
          title="Copiar link para enviar a tu pareja"
        >
          {copied ? <Check size={14} color="#10B981" /> : <Share2 size={14} color="#FB7185" />}
          <span>{spaceId}</span>
          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
            {copied ? '¡Copiado!' : 'Copiar link'}
          </span>
        </button>

        {/* Quick Partner Switcher */}
        <div
          className="partner-pill"
          onClick={onSwitchPartner}
          title={`Estás interactuando como ${currentPartner.name}. Clic para cambiar a ${otherPartner.name}`}
        >
          <div className={`partner-avatar ${currentPartnerId === 'p2' ? 'p2' : 'p1'}`}>
            {currentPartner.avatar}
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Viendo como</div>
            <div style={{ fontWeight: 700 }}>{currentPartner.name}</div>
          </div>
        </div>

        {/* AI Concierge Trigger */}
        <button
          className="btn btn-sparkle btn-sm"
          onClick={onOpenAiModal}
          title="Pedir recomendación y veredicto romántico a la IA"
        >
          <Sparkles size={15} />
          <span>Asesor IA</span>
        </button>

        {/* Add Accommodation Button */}
        <button
          className="btn btn-primary btn-sm"
          onClick={onOpenAddModal}
        >
          <Plus size={16} />
          <span>Agregar</span>
        </button>

        {/* Settings button */}
        <button
          className="btn btn-secondary btn-icon btn-sm"
          onClick={onOpenSettingsModal}
          title="Configuración de pareja y conexión"
        >
          <Settings size={16} />
        </button>

        {/* Change Space / Logout button */}
        {onLogout && (
          <button
            className="btn btn-secondary btn-icon btn-sm"
            onClick={onLogout}
            title="Cambiar de nido / Cerrar sesión"
            style={{ color: 'var(--text-muted)' }}
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </header>
  );
}
