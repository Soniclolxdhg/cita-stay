import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  ExternalLink, 
  MessageCircle, 
  Trash2, 
  Check, 
  AlertCircle, 
  Edit2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrencyPrice, normalizeUrl, getPlatformInfo } from '../utils/formatters';

export default function AccommodationCard({
  item,
  nights,
  currency,
  partners,
  currentPartnerId,
  onToggleReaction,
  onOpenComments,
  onEdit,
  onDelete
}) {
  const p1 = partners.partner1 || { name: 'Cami', avatar: '🌸' };
  const p2 = partners.partner2 || { name: 'Nico', avatar: '🐻' };

  const p1Reaction = item.reactions?.p1 || { liked: false, note: '' };
  const p2Reaction = item.reactions?.p2 || { liked: false, note: '' };

  const isMatch = Boolean(p1Reaction.liked && p2Reaction.liked);
  const effectiveCurrency = currency || item.currency || 'USD';
  const rawTotalPrice = (parseFloat(item.pricePerNight) || 0) * (parseInt(nights, 10) || 1);

  const cleanLink = normalizeUrl(item.link);
  const platformInfo = getPlatformInfo(cleanLink);

  const [editingNote, setEditingNote] = useState(false);
  const [currentNote, setCurrentNote] = useState(
    currentPartnerId === 'p2' ? p2Reaction.note || '' : p1Reaction.note || ''
  );

  // U4: Refresh note state when switching partner or when reaction updates
  useEffect(() => {
    const myNote = currentPartnerId === 'p2' ? p2Reaction.note : p1Reaction.note;
    setCurrentNote(myNote || '');
  }, [currentPartnerId, p1Reaction.note, p2Reaction.note]);

  // U3: Enforce single partner identity: you can only vote as your own partner identity
  const handleHeartClick = (partnerId) => {
    if (partnerId !== currentPartnerId) {
      return; // Cannot toggle heart for the other partner!
    }

    const currentLiked = partnerId === 'p2' ? p2Reaction.liked : p1Reaction.liked;
    const nextLiked = !currentLiked;

    // Check if this action creates a new match!
    const otherLiked = partnerId === 'p2' ? p1Reaction.liked : p2Reaction.liked;
    if (nextLiked && otherLiked) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FB7185', '#F43F5E', '#C084FC', '#FED7AA', '#FDE047']
      });
    }

    onToggleReaction(item.id, {
      partnerId,
      liked: nextLiked
    });
  };

  const handleSaveNote = () => {
    setEditingNote(false);
    onToggleReaction(item.id, {
      partnerId: currentPartnerId,
      note: currentNote
    });
  };

  return (
    <article className={`hotel-card ${isMatch ? 'is-match' : ''}`}>
      {/* Match Banner */}
      {isMatch && (
        <div className="match-banner">
          <span aria-hidden="true">💕</span>
          <span>¡Es un Match!</span>
        </div>
      )}

      {/* Media Image */}
      <div className="card-media">
        {cleanLink ? (
          <a
            href={cleanLink}
            target="_blank"
            rel="noopener noreferrer"
            className="card-media-clickable"
            title={`Abrir ${platformInfo?.label || 'enlace original'} en nueva pestaña`}
          >
            <img
              src={item.imageUrl}
              alt={item.title}
              className="card-img"
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80';
              }}
            />
            <div className="card-media-overlay-badge">
              <span>{platformInfo?.icon || '🔗'}</span>
              <span>{platformInfo?.label || 'Abrir enlace'} ↗</span>
            </div>
          </a>
        ) : (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="card-img"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80';
            }}
          />
        )}
        <div className="card-type-badge">{item.type || 'Alojamiento'}</div>
      </div>

      {/* Card Content Body */}
      <div className="card-body">
        <div className="card-header-row">
          <h3 className="card-title font-serif">
            {cleanLink ? (
              <a
                href={cleanLink}
                target="_blank"
                rel="noopener noreferrer"
                className="card-title-link"
                title={`Abrir ${platformInfo?.label || 'enlace original'} en nueva pestaña`}
              >
                <span>{item.title}</span>
                <ExternalLink size={14} className="title-link-icon" aria-hidden="true" />
              </a>
            ) : (
              <span>{item.title}</span>
            )}
          </h3>
        </div>

        <div className="card-location">
          <MapPin size={14} color="#FB7185" aria-hidden="true" />
          <span>{item.location || 'Ubicación a coordinar'}</span>
        </div>

        {/* Prominent Platform Link Button */}
        {cleanLink && platformInfo && (
          <div style={{ marginBottom: '0.85rem' }}>
            <a
              href={cleanLink}
              target="_blank"
              rel="noopener noreferrer"
              className="platform-chip-btn"
              title={`Abrir ${platformInfo.label} en nueva pestaña`}
            >
              <span>{platformInfo.icon}</span>
              <span>{platformInfo.label}</span>
              <ExternalLink size={13} style={{ marginLeft: 'auto' }} />
            </a>
          </div>
        )}

        {/* Pricing Box */}
        <div className="price-display">
          <div>
            <div className="night-price">
              {formatCurrencyPrice(item.pricePerNight, effectiveCurrency)}
              <small> / noche</small>
            </div>
          </div>
          <div className="total-stay-price">
            Total {nights} {nights === 1 ? 'noche' : 'noches'}:
            <strong>{formatCurrencyPrice(rawTotalPrice, effectiveCurrency)}</strong>
          </div>
        </div>

        {/* Description / Summary */}
        {item.description && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.4' }}>
            {item.description}
          </p>
        )}

        {/* Highlights List */}
        {item.highlights && item.highlights.length > 0 && (
          <div className="highlights-list">
            {item.highlights.slice(0, 3).map((h, idx) => (
              <div key={idx} className="highlight-item">
                <Check size={14} className="highlight-icon" aria-hidden="true" />
                <span>{h}</span>
              </div>
            ))}
          </div>
        )}

        {/* Cons / Watchouts */}
        {item.cons && item.cons.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            {item.cons.slice(0, 2).map((c, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#D97706' }}>
                <AlertCircle size={13} aria-hidden="true" />
                <span>{c}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tags Row */}
        {item.tags && item.tags.length > 0 && (
          <div className="tags-row">
            {item.tags.map((tag, idx) => (
              <span key={idx} className="tag-badge">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Couple Voting & Reactions Section */}
        <div className="voting-section">
          <div className="voting-title">
            <span>Opinión de la Pareja</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--rose-500)', fontWeight: 'normal' }}>
              (Toca tu corazón para votar)
            </span>
          </div>

          <div className="partner-votes-grid">
            {/* Partner 1 Vote */}
            <div className={`partner-vote-card ${p1Reaction.liked ? 'voted' : ''}`}>
              <div className="vote-header">
                <span className="vote-name">
                  <span aria-hidden="true">{p1.avatar}</span>
                  <span>{p1.name}</span>
                </span>
                <button
                  type="button"
                  className={`heart-toggle-btn ${p1Reaction.liked ? 'liked' : ''}`}
                  onClick={() => handleHeartClick('p1')}
                  disabled={currentPartnerId !== 'p1'}
                  title={
                    currentPartnerId === 'p1'
                      ? (p1Reaction.liked ? 'Quitar mi corazón' : 'Dar mi corazón 💕')
                      : `Voto de ${p1.name} (solo ${p1.name} puede votar aquí)`
                  }
                  aria-label={`Voto de ${p1.name}`}
                  style={{
                    opacity: currentPartnerId === 'p1' ? 1 : 0.75,
                    cursor: currentPartnerId === 'p1' ? 'pointer' : 'default'
                  }}
                >
                  {p1Reaction.liked ? '❤️' : '🤍'}
                </button>
              </div>

              {p1Reaction.note ? (
                <div className="vote-note">"{p1Reaction.note}"</div>
              ) : (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {p1Reaction.liked ? '¡Le encantó!' : 'Sin voto aún'}
                </div>
              )}
            </div>

            {/* Partner 2 Vote */}
            <div className={`partner-vote-card ${p2Reaction.liked ? 'voted' : ''}`}>
              <div className="vote-header">
                <span className="vote-name">
                  <span aria-hidden="true">{p2.avatar}</span>
                  <span>{p2.name}</span>
                </span>
                <button
                  type="button"
                  className={`heart-toggle-btn ${p2Reaction.liked ? 'liked' : ''}`}
                  onClick={() => handleHeartClick('p2')}
                  disabled={currentPartnerId !== 'p2'}
                  title={
                    currentPartnerId === 'p2'
                      ? (p2Reaction.liked ? 'Quitar mi corazón' : 'Dar mi corazón 💕')
                      : `Voto de ${p2.name} (solo ${p2.name} puede votar aquí)`
                  }
                  aria-label={`Voto de ${p2.name}`}
                  style={{
                    opacity: currentPartnerId === 'p2' ? 1 : 0.75,
                    cursor: currentPartnerId === 'p2' ? 'pointer' : 'default'
                  }}
                >
                  {p2Reaction.liked ? '❤️' : '🤍'}
                </button>
              </div>

              {p2Reaction.note ? (
                <div className="vote-note">"{p2Reaction.note}"</div>
              ) : (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {p2Reaction.liked ? '¡Le encantó!' : 'Sin voto aún'}
                </div>
              )}
            </div>
          </div>

          {/* Quick Note Input for current partner */}
          <div style={{ marginTop: '0.5rem' }}>
            {editingNote ? (
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
                <input
                  type="text"
                  placeholder="Tu opinión (ej: Me encanta la vista, o Muy lejos)..."
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  className="form-input"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveNote();
                    }
                  }}
                  autoFocus
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveNote}>
                  Guardar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', fontSize: '0.78rem', padding: '0.3rem', borderStyle: 'dashed' }}
                onClick={() => setEditingNote(true)}
              >
                <Edit2 size={12} />
                <span>
                  {(currentPartnerId === 'p2' ? p2Reaction.note : p1Reaction.note)
                    ? 'Editar mi nota'
                    : 'Dejar mi opinión personal'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="card-footer" style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className="comment-trigger"
            onClick={() => onOpenComments(item)}
            title="Abrir charla y mensajitos de pareja"
            aria-label="Abrir mensajes del alojamiento"
          >
            <MessageCircle size={15} color="#FB7185" />
            <span>
              {item.comments?.length > 0
                ? `${item.comments.length} ${item.comments.length === 1 ? 'mensaje' : 'mensajes'}`
                : 'Mensajes'}
            </span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* U5: Edit Accommodation Button */}
            {onEdit && (
              <button
                type="button"
                className="btn btn-secondary btn-icon btn-sm"
                onClick={() => onEdit(item)}
                title="Editar este alojamiento"
                aria-label="Editar este alojamiento"
              >
                <Edit2 size={14} />
              </button>
            )}

            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-icon btn-sm"
                title="Abrir enlace original"
                aria-label="Abrir enlace original"
              >
                <ExternalLink size={14} />
              </a>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-icon btn-sm"
              onClick={() => onDelete(item.id)}
              title="Eliminar este alojamiento"
              aria-label="Eliminar este alojamiento"
              style={{ color: '#EF4444' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
