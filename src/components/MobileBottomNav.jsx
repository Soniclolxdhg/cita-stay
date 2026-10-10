import React from 'react';
import { Sparkles, Plus, Settings } from 'lucide-react';

export default function MobileBottomNav({
  currentPartner,
  onSwitchPartner,
  onOpenAddModal,
  onOpenAiModal,
  onOpenSettingsModal,
  matchesCount
}) {
  return (
    <nav className="mobile-dock" aria-label="Navegación móvil">
      {/* Switch Partner */}
      <button
        className="mobile-dock-btn"
        onClick={onSwitchPartner}
        title={`Cambiar de pareja (Viendo como ${currentPartner.name})`}
      >
        <span className="dock-avatar">{currentPartner.avatar}</span>
        <span className="dock-label">{currentPartner.name}</span>
      </button>

      {/* AI Concierge */}
      <button
        className="mobile-dock-btn"
        onClick={onOpenAiModal}
        title="Consultar al Asesor Romántico IA"
      >
        <div className="dock-icon-wrapper sparkle">
          <Sparkles size={18} />
          {matchesCount > 0 && <span className="dock-badge">{matchesCount}</span>}
        </div>
        <span className="dock-label">Asesor IA</span>
      </button>

      {/* Prominent Add Button */}
      <button
        className="mobile-dock-btn dock-main-add"
        onClick={onOpenAddModal}
        title="Agregar nuevo alojamiento con link o IA"
      >
        <div className="dock-add-bubble">
          <Plus size={22} color="white" />
        </div>
        <span className="dock-label" style={{ fontWeight: 700, color: 'var(--rose-600)' }}>Agregar</span>
      </button>

      {/* Settings / Space Share */}
      <button
        className="mobile-dock-btn"
        onClick={onOpenSettingsModal}
        title="Espacio de pareja y compartir link"
      >
        <div className="dock-icon-wrapper">
          <Settings size={18} />
        </div>
        <span className="dock-label">Espacio</span>
      </button>
    </nav>
  );
}
