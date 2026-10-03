import React, { useState } from 'react';
import { X, Send, Trash2 } from 'lucide-react';

export default function CommentsModal({
  isOpen,
  onClose,
  item,
  currentPartnerId,
  partners,
  onAddComment,
  onDeleteComment
}) {
  const [commentText, setCommentText] = useState('');

  if (!isOpen || !item) return null;

  const comments = item.comments || [];
  const currentPartner = partners[currentPartnerId === 'p2' ? 'partner2' : 'partner1'] || {
    name: 'Pareja',
    avatar: '🌸'
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    onAddComment(item.id, {
      partnerId: currentPartnerId,
      text: commentText.trim()
    });

    setCommentText('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>
              <span>💬</span> Notas de Pareja
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              {item.title}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Lodging Preview Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', background: 'var(--rose-50)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
          <img
            src={item.imageUrl}
            alt={item.title}
            style={{ width: '45px', height: '45px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80';
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.title}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--rose-600)', fontWeight: 600 }}>
              {item.currency} ${item.pricePerNight} / noche
            </div>
          </div>
        </div>

        {/* Message Thread */}
        <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingRight: '0.25rem', marginBottom: '1.25rem' }}>
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💌</div>
              No hay mensajitos todavía. ¡Sé quien deje la primera nota sobre este lugar!
            </div>
          ) : (
            comments.map((c) => {
              const isMine = c.partnerId === currentPartnerId;
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMine ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>{c.avatar}</span>
                    <span>{c.partnerName}</span>
                  </div>

                  <div
                    style={{
                      background: isMine ? 'linear-gradient(135deg, var(--rose-400), var(--rose-500))' : 'white',
                      color: isMine ? 'white' : 'var(--text-primary)',
                      border: isMine ? 'none' : '1px solid var(--border-soft)',
                      padding: '0.65rem 0.95rem',
                      borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      fontSize: '0.88rem',
                      maxWidth: '85%',
                      boxShadow: 'var(--shadow-subtle)',
                      position: 'relative'
                    }}
                  >
                    {c.text}
                  </div>

                  {isMine && onDeleteComment && (
                    <button
                      onClick={() => onDeleteComment(item.id, c.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-subtle)',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        marginTop: '0.2rem'
                      }}
                      title="Eliminar este comentario"
                    >
                      Borrar
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Input box */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder={`Escribe un mensaje como ${currentPartner.avatar} ${currentPartner.name}...`}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.88rem' }}
            autoFocus
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={!commentText.trim()}>
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
