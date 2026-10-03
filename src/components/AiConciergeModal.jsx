import React, { useState, useEffect } from 'react';
import { Sparkles, X, Award, DollarSign, Crown, Heart, RefreshCw, Compass } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AiConciergeModal({
  isOpen,
  onClose,
  accommodations,
  nights,
  currency,
  partners,
  apiKey
}) {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [error, setError] = useState(null);

  const p1 = partners.partner1 || { name: 'Cami', avatar: '🌸' };
  const p2 = partners.partner2 || { name: 'Nico', avatar: '🐻' };

  const fetchRecommendation = async () => {
    if (!accommodations || accommodations.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accommodations,
          nights,
          currency,
          partners,
          apiKey
        })
      });

      const data = await res.json();
      if (data.success && data.recommendation) {
        setRecommendation(data.recommendation);
        // Throw celebration confetti for the verdict!
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.5 },
          colors: ['#FB7185', '#C084FC', '#FBBF24']
        });
      } else {
        setError(data.error || 'No se pudo generar la recomendación.');
      }
    } catch (err) {
      console.error('Error fetching recommendation:', err);
      setError('Hubo un error de conexión con el Asesor IA.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accommodations.length > 0 && !recommendation) {
      fetchRecommendation();
    }
  }, [isOpen, accommodations]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="concierge-avatar">
              🕊️
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Asesor Romántico IA</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                Analizando {accommodations.length} opciones para {p1.name} y {p2.name} ({nights} noches)
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', animation: 'pulseGentle 1.5s infinite' }}>
              💕
            </div>
            <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Consultando con el Asesor Romántico...
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Comparando precios, ubicación, comodidades y los gustos de ambos.
            </p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <p style={{ color: '#EF4444', marginBottom: '1rem' }}>{error}</p>
            <button className="btn btn-secondary" onClick={fetchRecommendation}>
              Reintentar
            </button>
          </div>
        ) : recommendation ? (
          <div>
            {/* 3 Categories Grid */}
            <div className="concierge-grid">
              {/* Winner */}
              <div className="recommendation-box winner">
                <span className="box-badge winner-badge">
                  👑 La Elección Ganadora
                </span>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                  {recommendation.winnerTitle}
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {recommendation.winnerReason}
                </p>
              </div>

              {/* Best Value */}
              <div className="recommendation-box">
                <span className="box-badge value-badge">
                  💰 Mejor Calidad / Precio
                </span>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                  {recommendation.bestValueTitle}
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {recommendation.bestValueReason}
                </p>
              </div>

              {/* Splurge */}
              <div className="recommendation-box">
                <span className="box-badge splurge-badge">
                  🥂 Para Darse un Gusto
                </span>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                  {recommendation.splurgeTitle}
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {recommendation.splurgeReason}
                </p>
              </div>
            </div>

            {/* Verdict text */}
            <div className="verdict-text">
              <h4 style={{ fontSize: '1rem', color: 'var(--rose-600)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Heart size={16} /> Veredicto para la Pareja
              </h4>
              <div style={{ whiteSpace: 'pre-line' }}>
                {recommendation.coupleVerdict}
              </div>
            </div>

            {/* Romantic Tip */}
            {recommendation.romanticTip && (
              <div className="tip-banner">
                <Sparkles size={20} color="#F59E0B" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Tip Romántico de Viaje:</strong> {recommendation.romanticTip}
                </div>
              </div>
            )}

            {/* Modal actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.75rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={fetchRecommendation}
                disabled={loading}
              >
                <RefreshCw size={14} /> Volver a analizar
              </button>

              <button className="btn btn-primary" onClick={onClose}>
                ¡Entendido, a reservar! 💕
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <p>Agrega al menos 1 alojamiento para que el Asesor IA pueda comparar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
