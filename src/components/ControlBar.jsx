import React from 'react';
import { LayoutGrid, Table, ArrowUpDown } from 'lucide-react';

export default function ControlBar({
  activeFilter,
  onFilterChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  matchesCount,
  types
}) {
  return (
    <div className="control-bar">
      <div className="filter-group">
        <button
          className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => onFilterChange('all')}
        >
          Todos
        </button>

        <button
          className={`filter-chip ${activeFilter === 'matches' ? 'active' : ''}`}
          onClick={() => onFilterChange('matches')}
        >
          💕 Matches ({matchesCount})
        </button>

        {types.map((type) => (
          <button
            key={type}
            className={`filter-chip ${activeFilter === type ? 'active' : ''}`}
            onClick={() => onFilterChange(type)}
          >
            {type}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {/* Sort selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <ArrowUpDown size={14} color="var(--text-muted)" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="form-select"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem', width: 'auto' }}
          >
            <option value="featured">Destacados / Matches</option>
            <option value="price-asc">Menor precio / noche</option>
            <option value="price-desc">Mayor precio / noche</option>
            <option value="name">Alfabético</option>
          </select>
        </div>

        {/* View Toggle */}
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => onViewModeChange('grid')}
            title="Vista en tarjetas"
          >
            <LayoutGrid size={15} />
            <span>Tarjetas</span>
          </button>
          <button
            className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => onViewModeChange('table')}
            title="Vista en tabla comparativa"
          >
            <Table size={15} />
            <span>Tabla</span>
          </button>
        </div>
      </div>
    </div>
  );
}
