import React from 'react';
import { ExternalLink, MessageCircle, Trash2, Check, MapPin } from 'lucide-react';

export default function ComparisonTable({
  items,
  nights,
  currency,
  partners,
  currentPartnerId,
  onToggleReaction,
  onOpenComments,
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
            const total = (item.pricePerNight * nights).toLocaleString();

            return (
              <tr key={item.id} className={isMatch ? 'is-match' : ''}>
                {/* Hotel details */}
                <td>
                  <div className="table-hotel-cell">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="table-thumb"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80';
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.title}
                      </div>
                      {item.highlights && item.highlights[0] && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--mint-500)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Check size={12} />
                          <span>{item.highlights[0]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Type */}
                <td>
                  <span className="tag-badge" style={{ textTransform: 'capitalize' }}>
                    {item.type}
                  </span>
                </td>

                {/* Location */}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                    <MapPin size={13} color="#FB7185" />
                    <span>{item.location}</span>
                  </div>
                </td>

                {/* Price per night */}
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--rose-600)' }}>
                    {item.currency || currency} ${item.pricePerNight}
                  </div>
                </td>

                {/* Total price */}
                <td>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                    {item.currency || currency} ${total}
                  </div>
                </td>

                {/* Partner 1 Reaction */}
                <td style={{ textAlign: 'center' }}>
                  <button
                    className={`heart-toggle-btn ${p1Liked ? 'liked' : ''}`}
                    onClick={() => onToggleReaction(item.id, { partnerId: 'p1', liked: !p1Liked })}
                    style={{ margin: '0 auto', cursor: 'pointer' }}
                    title={`Voto de ${p1.name}. Clic para cambiar.`}
                  >
                    {p1Liked ? '❤️' : '🤍'}
                  </button>
                  {item.reactions?.p1?.note && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: '120px', margin: '0 auto' }}>
                      "{item.reactions.p1.note}"
                    </div>
                  )}
                </td>

                {/* Partner 2 Reaction */}
                <td style={{ textAlign: 'center' }}>
                  <button
                    className={`heart-toggle-btn ${p2Liked ? 'liked' : ''}`}
                    onClick={() => onToggleReaction(item.id, { partnerId: 'p2', liked: !p2Liked })}
                    style={{ margin: '0 auto', cursor: 'pointer' }}
                    title={`Voto de ${p2.name}. Clic para cambiar.`}
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
                      className="btn btn-secondary btn-icon btn-sm"
                      onClick={() => onOpenComments(item)}
                      title="Ver mensajes y notas"
                    >
                      <MessageCircle size={14} color="#FB7185" />
                    </button>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-icon btn-sm"
                        title="Abrir enlace original"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button
                      className="btn btn-secondary btn-icon btn-sm"
                      onClick={() => onDelete(item.id)}
                      title="Eliminar"
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
