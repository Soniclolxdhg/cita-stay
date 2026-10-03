import React, { useState } from 'react';
import { Sparkles, X, Link as LinkIcon, Image, MapPin, DollarSign, Check, RefreshCw } from 'lucide-react';

const RANDOM_PHOTOS = [
  'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80'
];

export default function AddAccommodationModal({
  isOpen,
  onClose,
  onAdd,
  currentPartnerId,
  currency = 'USD',
  apiKey = ''
}) {
  const [extractUrl, setExtractUrl] = useState('');
  const [extractNotes, setExtractNotes] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractSuccess, setExtractSuccess] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Cabaña');
  const [location, setLocation] = useState('');
  const [pricePerNight, setPricePerNight] = useState('');
  const [imageUrl, setImageUrl] = useState(RANDOM_PHOTOS[0]);
  const [link, setLink] = useState('');
  const [description, setDescription] = useState('');
  const [highlightsInput, setHighlightsInput] = useState('');
  const [consInput, setConsInput] = useState('');

  if (!isOpen) return null;

  const handlePickRandomPhoto = () => {
    const nextPhoto = RANDOM_PHOTOS[Math.floor(Math.random() * RANDOM_PHOTOS.length)];
    setImageUrl(nextPhoto);
  };

  const handleAiExtract = async () => {
    if (!extractUrl.trim() && !extractNotes.trim()) {
      alert('Ingresa un link o un texto para analizar con IA');
      return;
    }

    setIsExtracting(true);
    setExtractSuccess(false);

    try {
      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: extractUrl.trim(),
          rawText: extractNotes.trim(),
          apiKey
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        const item = data.data;
        if (item.title) setTitle(item.title);
        if (item.type) setType(item.type);
        if (item.location) setLocation(item.location);
        if (item.pricePerNight) setPricePerNight(item.pricePerNight);
        if (item.imageUrl) setImageUrl(item.imageUrl);
        if (item.link) setLink(item.link);
        if (item.description) setDescription(item.description);
        if (item.highlights && Array.isArray(item.highlights)) {
          setHighlightsInput(item.highlights.join('\n'));
        }
        if (item.cons && Array.isArray(item.cons)) {
          setConsInput(item.cons.join('\n'));
        }
        setExtractSuccess(true);
        setTimeout(() => setExtractSuccess(false), 3000);
      } else {
        alert('No pudimos extraer todos los datos automáticamente, pero puedes completarlos a mano.');
      }
    } catch (err) {
      console.error('Error extracting with AI:', err);
      alert('Hubo un inconveniente con el análisis, completa los campos manualmente.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Por favor ingresa al menos el nombre del lugar');
      return;
    }

    const highlights = highlightsInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const cons = consInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    onAdd({
      title: title.trim(),
      type,
      location: location.trim() || 'Zona a coordinar',
      pricePerNight: parseFloat(pricePerNight) || 100,
      currency,
      imageUrl: imageUrl.trim() || RANDOM_PHOTOS[0],
      link: link.trim() || extractUrl.trim(),
      description: description.trim(),
      highlights: highlights.length > 0 ? highlights : ['Ideal para descansar en pareja'],
      cons,
      addedBy: currentPartnerId
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <span>✨</span>
            <span>Nuevo Alojamiento</span>
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* AI Extractor Box */}
        <div className="ai-extract-box">
          <div className="ai-box-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={16} />
              <span>Extracción Automática con IA</span>
            </span>
            {extractSuccess && (
              <span style={{ color: 'var(--mint-500)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Check size={14} /> ¡Datos extraídos con éxito!
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Pega el enlace de <strong>Airbnb, Booking, Instagram, Google Maps</strong> o una descripción y la IA autocompletará los detalles.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <input
              type="url"
              placeholder="https://www.airbnb.com/... o https://instagram.com/..."
              value={extractUrl}
              onChange={(e) => setExtractUrl(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.88rem' }}
            />
            <button
              type="button"
              className="btn btn-sparkle"
              onClick={handleAiExtract}
              disabled={isExtracting}
            >
              {isExtracting ? (
                <>
                  <RefreshCw size={14} className="spin-animate" />
                  <span>Analizando...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Extraer</span>
                </>
              )}
            </button>
          </div>

          <textarea
            placeholder="Opcional: pega texto o notas adicionales para que la IA lo interprete..."
            value={extractNotes}
            onChange={(e) => setExtractNotes(e.target.value)}
            className="form-textarea"
            rows="2"
            style={{ fontSize: '0.82rem', resize: 'vertical' }}
          />
        </div>

        {/* Manual Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre del Alojamiento *</label>
            <input
              type="text"
              placeholder="Ej: Cabaña Vista al Lago con Tina Caliente"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo de Alojamiento</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="form-select"
              >
                <option value="Cabaña">Cabaña Romántica</option>
                <option value="Hotel Boutique">Hotel Boutique</option>
                <option value="Glamping">Glamping / Domo</option>
                <option value="Departamento">Departamento / Loft</option>
                <option value="Villa">Villa Privada</option>
                <option value="Resort">Resort & Spa</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Precio por Noche ({currency}) *</label>
              <input
                type="number"
                placeholder="Ej: 120"
                value={pricePerNight}
                onChange={(e) => setPricePerNight(e.target.value)}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ubicación / Zona</label>
            <input
              type="text"
              placeholder="Ej: Bariloche, Circuito Chico o Playa del Carmen"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label className="form-label" style={{ margin: 0 }}>URL de Foto</label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handlePickRandomPhoto}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
              >
                <Sparkles size={12} /> Cambiar foto al azar
              </button>
            </div>
            <input
              type="url"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="form-input"
            />
            {imageUrl && (
              <div style={{ marginTop: '0.5rem', height: '110px', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <img
                  src={imageUrl}
                  alt="Vista previa"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = RANDOM_PHOTOS[0];
                  }}
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Link Original (Airbnb, Instagram, etc.)</label>
            <input
              type="url"
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Puntos Fuertes / Ventajas (1 por línea)</label>
            <textarea
              placeholder="Tina caliente privada&#10;Vista al lago&#10;Desayuno casero incluido"
              value={highlightsInput}
              onChange={(e) => setHighlightsInput(e.target.value)}
              className="form-textarea"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Detalles a considerar (1 por línea)</label>
            <textarea
              placeholder="Requiere vehículo para llegar&#10;Check-in tardío"
              value={consInput}
              onChange={(e) => setConsInput(e.target.value)}
              className="form-textarea"
              rows="2"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Breve Descripción</label>
            <textarea
              placeholder="Notas sobre el lugar..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              rows="2"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar en Nuestro Nido 💕
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
