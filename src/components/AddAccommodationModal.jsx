import React, { useState, useEffect } from 'react';
import { Sparkles, X, Link as LinkIcon, MapPin, Check, RefreshCw } from 'lucide-react';

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
  initialItem = null
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

  // U5: Synchronize form state if editing an existing item
  useEffect(() => {
    if (initialItem) {
      setTitle(initialItem.title || '');
      setType(initialItem.type || 'Cabaña');
      setLocation(initialItem.location || '');
      setPricePerNight(initialItem.pricePerNight || '');
      setImageUrl(initialItem.imageUrl || RANDOM_PHOTOS[0]);
      setLink(initialItem.link || '');
      setDescription(initialItem.description || '');
      setHighlightsInput(Array.isArray(initialItem.highlights) ? initialItem.highlights.join('\n') : '');
      setConsInput(Array.isArray(initialItem.cons) ? initialItem.cons.join('\n') : '');
    } else {
      setTitle('');
      setType('Cabaña');
      setLocation('');
      setPricePerNight('');
      setImageUrl(RANDOM_PHOTOS[Math.floor(Math.random() * RANDOM_PHOTOS.length)]);
      setLink('');
      setDescription('');
      setHighlightsInput('');
      setConsInput('');
      setExtractUrl('');
      setExtractNotes('');
    }
  }, [initialItem, isOpen]);

  // Q7: Body scroll lock & U6: Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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
      // S5: Call server without sending client apiKey
      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: extractUrl.trim(),
          rawText: extractNotes.trim()
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

    const payload = {
      ...(initialItem || {}),
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
      addedBy: initialItem ? initialItem.addedBy || currentPartnerId : currentPartnerId
    };

    onAdd(payload);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={initialItem ? "Editar Alojamiento" : "Nuevo Alojamiento"}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <span aria-hidden="true">✨</span>
            <span>{initialItem ? 'Editar Alojamiento' : 'Nuevo Alojamiento'}</span>
          </h3>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        {/* AI Quick Extractor Banner (only on new item) */}
        {!initialItem && (
          <div className="ai-extractor-box">
            <div className="ai-box-header">
              <Sparkles size={16} color="var(--rose-600)" />
              <span className="ai-box-title">Extracción Inteligente con IA</span>
              <span className="ai-badge">Automático</span>
            </div>
            <p className="ai-box-desc">
              Pega el enlace de Airbnb, Booking o Instagram, o pega notas. La IA completará fotos, precios y detalles:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="url"
                  placeholder="https://www.airbnb.com/rooms/... o post de Instagram"
                  value={extractUrl}
                  onChange={(e) => setExtractUrl(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <textarea
                placeholder="O pega notas copiadas del alojamiento..."
                value={extractNotes}
                onChange={(e) => setExtractNotes(e.target.value)}
                className="form-textarea"
                rows="2"
                style={{ fontSize: '0.8rem', minHeight: '52px' }}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleAiExtract}
              disabled={isExtracting}
              style={{ width: '100%', gap: '0.4rem' }}
            >
              {isExtracting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Analizando con IA...</span>
                </>
              ) : extractSuccess ? (
                <>
                  <Check size={14} color="#10B981" />
                  <span>¡Datos extraídos con éxito!</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Analizar y Auto-completar</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Manual Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre del Alojamiento *</label>
            <input
              type="text"
              placeholder="Ej: Cabaña Las Araucarias & Tina Caliente"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Tipo de Lugar</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="form-select"
              >
                <option value="Cabaña">Cabaña</option>
                <option value="Hotel Boutique">Hotel Boutique</option>
                <option value="Glamping">Glamping</option>
                <option value="Departamento">Departamento</option>
                <option value="Villa">Villa Privada</option>
                <option value="Resort & Spa">Resort & Spa</option>
                <option value="Casa de Campo">Casa de Campo</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Precio por Noche ({currency})</label>
              <input
                type="text"
                placeholder="Ej: 80000 o 135"
                value={pricePerNight}
                onChange={(e) => setPricePerNight(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ubicación / Ciudad</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Ej: Bariloche, Puerto Varas, Mendoza..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="form-input"
              />
              <MapPin size={16} color="var(--text-muted)" style={{ position: 'absolute', right: '12px', top: '12px' }} />
            </div>
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
            <div style={{ position: 'relative' }}>
              <input
                type="url"
                placeholder="https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="form-input"
              />
              <LinkIcon size={16} color="var(--text-muted)" style={{ position: 'absolute', right: '12px', top: '12px' }} />
            </div>
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
              {initialItem ? 'Guardar Cambios 💕' : 'Guardar en Nuestro Nido 💕'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
