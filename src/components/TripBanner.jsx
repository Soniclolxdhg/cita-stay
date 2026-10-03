import React from 'react';
import { Moon, DollarSign, Heart, Sparkles, MapPin } from 'lucide-react';

export default function TripBanner({
  tripName,
  nights,
  currency,
  onUpdateTrip,
  partners,
  totalCount,
  matchesCount
}) {
  const p1 = partners.partner1 || { name: 'Cami', avatar: '🌸' };
  const p2 = partners.partner2 || { name: 'Nico', avatar: '🐻' };

  return (
    <section className="trip-banner">
      <div className="trip-title-section">
        <h2>
          <span>{tripName || 'Nuestra Escapada Romántica'}</span>
        </h2>
        <p>
          Espacio compartido de <strong>{p1.avatar} {p1.name}</strong> y <strong>{p2.avatar} {p2.name}</strong> para soñar y elegir juntos.
        </p>
      </div>

      <div className="trip-config-pills">
        {/* Match Count Badge */}
        {matchesCount > 0 && (
          <div className="match-stat-badge" title="Alojamientos que ambos amaron">
            <span>💕</span>
            <span>{matchesCount} {matchesCount === 1 ? 'Match Mutuo' : 'Matches Mutuos'}</span>
          </div>
        )}

        {/* Nights Selector */}
        <div className="config-item" title="Cambia la cantidad de noches para calcular el total automático">
          <Moon size={15} color="#A855F7" />
          <span>Noches:</span>
          <input
            type="number"
            min="1"
            max="60"
            value={nights}
            onChange={(e) => onUpdateTrip({ nights: parseInt(e.target.value, 10) || 1 })}
          />
        </div>

        {/* Currency Selector */}
        <div className="config-item" title="Moneda para visualizar los precios">
          <DollarSign size={15} color="#10B981" />
          <span>Moneda:</span>
          <select
            value={currency}
            onChange={(e) => onUpdateTrip({ currency: e.target.value })}
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="ARS">ARS ($)</option>
            <option value="MXN">MXN ($)</option>
            <option value="CLP">CLP ($)</option>
            <option value="COP">COP ($)</option>
          </select>
        </div>
      </div>
    </section>
  );
}
