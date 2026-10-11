import React from 'react';
import { ExternalLink, MessageCircle, Trash2, MapPin, Edit2 } from 'lucide-react';
import { formatCurrencyPrice, normalizeUrl, getPlatformInfo } from '../utils/formatters';

export default function ComparisonTable({
  items,
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

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="table-wrapper">
      <table className="compare-table">
        <thead>
          <tr>
            <th>Alojamiento</th>
            <th>Tipo</th>
            <th>Ubicación</th>
            <th>Precio / Noche</th>
            <th>Total ({nights} n.)</th>
            <th style={{ textAlign: 'center' }}>{p1.avatar} {p1.name}</th>
            <th style={{ textAlign: 'center' }}>{p2.avatar} {p2.name}</th>
            <th style={{ textAlign: 'center' }}>Match 💕</th>
            <th style={{ textAlign: 'center' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const p1Liked = !!item.reactions?.p1?.liked;
            const p2Liked = !!item.reactions?.p2?.liked;
            const isMatch = p1Liked && p2Liked;

            const effectiveCurrency = currency || item.currency || 'USD';
            const rawTotal = (parseFloat(item.pricePerNight) || 0) * (parseInt(nights, 10) || 1);

            const cleanLink = normalizeUrl(item.link);
            const platformInfo = getPlatformInfo(cleanLink);

            return (
              <tr key={item.id} className={isMatch ? 'table-match-row' : ''}>
                {/* Title + Thumbnail */}
                <td>
                  {cleanLink ? (
                    <a
                      href={cleanLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit' }}
                      title={`Abrir ${platformInfo?.label || 'enlace original'} en nueva pestaña`}
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: 'var(--radius-sm)',
                          objectFit: 'cover',
                          flexShrink: 0
                        }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--rose-600)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>{item.title}</span>
                          <ExternalLink size={12} color="var(--rose-400)" />
                        </div>
                        {item.highlights && item.highlights[0] && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            ✨ {item.highlights[0]}
                          </div>
                        )}
                      </div>
                    </a>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: 'var(--radius-sm)',
                          objectFit: 'cover',
                          flexShrink: 0
                        }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          {item.title}
                        </div>
                        {item.highlights && item.highlights[0] && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            ✨ {item.highlights[0]}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </td>

                {/* Type */}
                <td>
                  <span className="card-type-badge" style={{ position: 'static', display: 'inline-block' }}>
                    {item.type || 'Cabaña'}
                  </span>
                </td>

                {/* Location */}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                    <MapPin size={13} color="var(--rose-500)" aria-hidden="true" />
                    <span>{item.location || 'A definir'}</span>
                  </div>
                </td>

                {/* Price per night */}
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {formatCurrencyPrice(item.pricePerNight, effectiveCurrency)}
                  </div>
                </td>

                {/* Total price */}
                <td>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                    {formatCurrencyPrice(rawTotal, effectiveCurrency)}
                  </div>
                </td>

                {/* U3: Partner 1 Reaction (Only p1 can vote here) */}
                <td style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    className={`heart-toggle-btn ${p1Liked ? 'liked' : ''}`}
                    onClick={() => currentPartnerId === 'p1' && onToggleReaction(item.id, { partnerId: 'p1', liked: !p1Liked })}
                    disabled={currentPartnerId !== 'p1'}
                    style={{
                      margin: '0 auto',
                      cursor: currentPartnerId === 'p1' ? 'pointer' : 'default',
                      opacity: currentPartnerId === 'p1' ? 1 : 0.75
                    }}
                    title={
                      currentPartnerId === 'p1'
                        ? (p1Liked ? 'Quitar mi voto' : 'Dar mi voto 💕')
                        : `Voto de ${p1.name} (solo ${p1.name} puede votar aquí)`
                    }
                    aria-label={`Voto de ${p1.name}`}
                  >
                    {p1Liked ? '❤️' : '🤍'}
                  </button>
                  {item.reactions?.p1?.note && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: '120px', margin: '0 auto' }}>
                      "{item.reactions.p1.note}"
                    </div>
                  )}
                </td>

                {/* U3: Partner 2 Reaction (Only p2 can vote here) */}
                <td style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    className={`heart-toggle-btn ${p2Liked ? 'liked' : ''}`}
                    onClick={() => currentPartnerId === 'p2' && onToggleReaction(item.id, { partnerId: 'p2', liked: !p2Liked })}
                    disabled={currentPartnerId !== 'p2'}
                    style={{
                      margin: '0 auto',
                      cursor: currentPartnerId === 'p2' ? 'pointer' : 'default',
                      opacity: currentPartnerId === 'p2' ? 1 : 0.75
                    }}
                    title={
                      currentPartnerId === 'p2'
                        ? (p2Liked ? 'Quitar mi voto' : 'Dar mi voto 💕')
                        : `Voto de ${p2.name} (solo ${p2.name} puede votar aquí)`
                    }
                    aria-label={`Voto de ${p2.name}`}
                  >
                    {p2Liked ? '❤️' : '🤍'}
                  </button>
                  {item.reactions?.p2?.note && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: '120px', margin: '0 auto' }}>
                      "{item.reactions.p2.note}"
                    </div>
                  )}
                </td>

                {/* Match indicator */}
                <td style={{ textAlign: 'center' }}>
                  {isMatch ? (
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #FFE4E8, #FFCCD5)',
                        color: 'var(--rose-600)',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '9999px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}
                    >
                      💕 ¡Match!
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>—</span>
                  )}
                </td>

                {/* Actions */}
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon btn-sm"
                      onClick={() => onOpenComments(item)}
                      title="Ver mensajes y notas"
                      aria-label="Ver mensajes del alojamiento"
                    >
                      <MessageCircle size={14} color="#FB7185" />
                    </button>
                    {onEdit && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon btn-sm"
                        onClick={() => onEdit(item)}
                        title="Editar alojamiento"
                        aria-label="Editar alojamiento"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    {cleanLink && (
                      <a
                        href={cleanLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-icon btn-sm"
                        title={`Abrir ${platformInfo?.label || 'enlace original'}`}
                        aria-label={`Abrir ${platformInfo?.label || 'enlace original'}`}
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon btn-sm"
                      onClick={() => onDelete(item.id)}
                      title="Eliminar"
                      aria-label="Eliminar alojamiento"
                      style={{ color: '#EF4444' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
