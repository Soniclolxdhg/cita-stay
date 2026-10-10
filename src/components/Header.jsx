import React, { useState } from 'react';
import { Sparkles, Plus, Share2, Check, Settings, LogOut } from 'lucide-react';

export default function Header({
  spaceId,
  partners,
  currentPartnerId,
  onSwitchPartner,
  onOpenAddModal,
  onOpenAiModal,
  onOpenSettingsModal,
  onLogout,
  onOpenShareModal
}) {
  const [copied, setCopied] = useState(false);
  const currentPartner = partners[currentPartnerId === 'p2' ? 'partner2' : 'partner1'] || {
    name: 'Pareja',
    avatar: '🌸'
  };

  const targetPartnerRole = currentPartnerId === 'p1' ? 'p2' : 'p1';
  const otherPartner = partners[targetPartnerRole === 'p2' ? 'partner2' : 'partner1'] || {
    name: 'tu pareja',
    avatar: '🐻'
  };

  const handleCopyLink = () => {
    if (onOpenShareModal) {
      onOpenShareModal();
      return;
    }
    const partnerUrl = `${window.location.origin}${window.location.pathname}?space=${spaceId}&partner=${targetPartnerRole}`;
    navigator.clipboard.writeText(partnerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <header className="main-header">
      <div className="logo-area">
        <div className="logo-badge" title="Cita Stay - Alojamientos en Pareja" aria-hidden="true">
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
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleCopyLink}
          title={`Invitar a ${otherPartner.name} por WhatsApp o enlace`}
          aria-label={`Invitar a ${otherPartner.name}`}
          style={{ borderColor: 'var(--rose-300)' }}
        >
          {copied ? <Check size={14} color="#10B981" /> : <Share2 size={14} color="#FB7185" />}
          <span>{spaceId}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--rose-600)', fontWeight: 700 }}>
            {copied ? '¡Copiado!' : `Invitar a ${otherPartner.name}`}
          </span>
        </button>

        {/* U6: Quick Partner Switcher (Accessible button) */}
        <button
          type="button"
          className="partner-pill"
          onClick={onSwitchPartner}
          title={`Estás interactuando como ${currentPartner.name}. Clic para cambiar a ${otherPartner.name}`}
          aria-label={`Cambiar de pareja activa. Actualmente viendo como ${currentPartner.name}`}
          style={{ background: 'none', border: 'none', textAlign: 'left', font: 'inherit' }}
        >
          <div className={`partner-avatar ${currentPartnerId === 'p2' ? 'p2' : 'p1'}`} aria-hidden="true">
            {currentPartner.avatar}
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Viendo como</div>
            <div style={{ fontWeight: 700 }}>{currentPartner.name}</div>
          </div>
        </button>

        {/* AI Concierge Trigger */}
        <button
          type="button"
          className="btn btn-sparkle btn-sm"
          onClick={onOpenAiModal}
          title="Pedir recomendación y veredicto romántico a la IA"
          aria-label="Pedir recomendación al Asesor IA"
        >
          <Sparkles size={15} />
          <span>Asesor IA</span>
        </button>

        {/* Add Accommodation Button */}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onOpenAddModal}
          aria-label="Agregar nuevo alojamiento"
        >
          <Plus size={16} />
          <span>Agregar</span>
        </button>

        {/* Settings button */}
        <button
          type="button"
          className="btn btn-secondary btn-icon btn-sm"
          onClick={onOpenSettingsModal}
          title="Configuración de pareja y conexión"
          aria-label="Abrir configuración de pareja"
        >
          <Settings size={16} />
        </button>

        {/* Change Space / Logout button */}
        {onLogout && (
          <button
            type="button"
            className="btn btn-secondary btn-icon btn-sm"
            onClick={onLogout}
            title="Cambiar de nido / Cerrar sesión"
            aria-label="Cambiar de nido o cerrar sesión"
            style={{ color: 'var(--text-muted)' }}
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </header>
  );
}
