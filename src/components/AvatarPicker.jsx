import React, { useState, useEffect } from 'react';

export const EMOJI_SETS = {
  male: ['🐻', '🦁', '🚀', '☕', '🧢', '🕶️', '⚡', '🎮', '⚽', '🎸', '🐺', '🏄‍♂️', '🌲', '🍻'],
  female: ['🌸', '🌺', '🍓', '🎀', '👸', '💅', '🐱', '🐰', '🦋', '💖', '🌷', '🧁', '🥑', '✨'],
  neutral: ['🦊', '🐨', '🐼', '🌿', '🌊', '✨', '🥑', '🍕', '🌻', '🐶', '🍿', '🎈', '🌙', '🧸']
};

export default function AvatarPicker({
  selectedAvatar,
  onSelectAvatar,
  gender,
  onSelectGender,
  label = 'Género / Rol:'
}) {
  // Infer initial active tab from gender or selected avatar
  const getInitialTab = () => {
    if (gender === 'male' || gender === 'female' || gender === 'neutral') return gender;
    if (EMOJI_SETS.male.includes(selectedAvatar)) return 'male';
    if (EMOJI_SETS.female.includes(selectedAvatar)) return 'female';
    return 'neutral';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    if (gender && (gender === 'male' || gender === 'female' || gender === 'neutral')) {
      setActiveTab(gender);
    }
  }, [gender]);

  const handleGenderChange = (newGender) => {
    if (onSelectGender) onSelectGender(newGender);
    setActiveTab(newGender);

    // If changing gender and avatar belongs to opposite default, suggest appropriate icon
    if (newGender === 'male' && (selectedAvatar === '🌸' || EMOJI_SETS.female.includes(selectedAvatar))) {
      onSelectAvatar('🐻');
    } else if (newGender === 'female' && (selectedAvatar === '🐻' || EMOJI_SETS.male.includes(selectedAvatar))) {
      onSelectAvatar('🌸');
    } else if (newGender === 'neutral' && !EMOJI_SETS.neutral.includes(selectedAvatar)) {
      onSelectAvatar('✨');
    }
  };

  const currentList = EMOJI_SETS[activeTab] || EMOJI_SETS.neutral;

  return (
    <div className="avatar-picker-block" style={{ marginTop: '0.45rem', marginBottom: '0.75rem' }}>
      {/* Gender pills & category tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {label}
        </span>

        {/* Gender Selection Pills */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--rose-50)', padding: '0.2rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--rose-200)' }}>
          <button
            type="button"
            onClick={() => handleGenderChange('male')}
            style={{
              border: 'none',
              background: (gender === 'male' || (!gender && activeTab === 'male')) ? 'white' : 'transparent',
              color: (gender === 'male' || (!gender && activeTab === 'male')) ? 'var(--rose-600)' : 'var(--text-secondary)',
              fontWeight: (gender === 'male' || (!gender && activeTab === 'male')) ? 700 : 500,
              fontSize: '0.75rem',
              padding: '0.25rem 0.55rem',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              boxShadow: (gender === 'male' || (!gender && activeTab === 'male')) ? 'var(--shadow-subtle)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            👨 Él
          </button>
          <button
            type="button"
            onClick={() => handleGenderChange('female')}
            style={{
              border: 'none',
              background: (gender === 'female' || (!gender && activeTab === 'female')) ? 'white' : 'transparent',
              color: (gender === 'female' || (!gender && activeTab === 'female')) ? 'var(--rose-600)' : 'var(--text-secondary)',
              fontWeight: (gender === 'female' || (!gender && activeTab === 'female')) ? 700 : 500,
              fontSize: '0.75rem',
              padding: '0.25rem 0.55rem',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              boxShadow: (gender === 'female' || (!gender && activeTab === 'female')) ? 'var(--shadow-subtle)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            👩 Ella
          </button>
          <button
            type="button"
            onClick={() => handleGenderChange('neutral')}
            style={{
              border: 'none',
              background: (gender === 'neutral' || (!gender && activeTab === 'neutral')) ? 'white' : 'transparent',
              color: (gender === 'neutral' || (!gender && activeTab === 'neutral')) ? 'var(--rose-600)' : 'var(--text-secondary)',
              fontWeight: (gender === 'neutral' || (!gender && activeTab === 'neutral')) ? 700 : 500,
              fontSize: '0.75rem',
              padding: '0.25rem 0.55rem',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              boxShadow: (gender === 'neutral' || (!gender && activeTab === 'neutral')) ? 'var(--shadow-subtle)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            ✨ Neutro
          </button>
        </div>
      </div>

      {/* Quick category filter tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Emojis:</span>
        <button
          type="button"
          onClick={() => setActiveTab('male')}
          style={{
            border: 'none',
            background: activeTab === 'male' ? 'var(--rose-100)' : 'transparent',
            color: activeTab === 'male' ? 'var(--rose-600)' : 'var(--text-muted)',
            fontWeight: activeTab === 'male' ? 700 : 500,
            fontSize: '0.72rem',
            padding: '0.15rem 0.45rem',
            borderRadius: 'var(--radius-pill)',
            cursor: 'pointer'
          }}
        >
          👨 Chicos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('female')}
          style={{
            border: 'none',
            background: activeTab === 'female' ? 'var(--rose-100)' : 'transparent',
            color: activeTab === 'female' ? 'var(--rose-600)' : 'var(--text-muted)',
            fontWeight: activeTab === 'female' ? 700 : 500,
            fontSize: '0.72rem',
            padding: '0.15rem 0.45rem',
            borderRadius: 'var(--radius-pill)',
            cursor: 'pointer'
          }}
        >
          👩 Chicas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('neutral')}
          style={{
            border: 'none',
            background: activeTab === 'neutral' ? 'var(--rose-100)' : 'transparent',
            color: activeTab === 'neutral' ? 'var(--rose-600)' : 'var(--text-muted)',
            fontWeight: activeTab === 'neutral' ? 700 : 500,
            fontSize: '0.72rem',
            padding: '0.15rem 0.45rem',
            borderRadius: 'var(--radius-pill)',
            cursor: 'pointer'
          }}
        >
          ✨ Tiernos
        </button>
      </div>

      {/* Grid of Emojis */}
      <div className="avatar-picker-mini" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {currentList.map((emoji) => {
          const isSelected = selectedAvatar === emoji;
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelectAvatar(emoji)}
              className={`avatar-chip ${isSelected ? 'active' : ''}`}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: isSelected ? '2px solid var(--rose-500)' : '1px solid var(--border-soft)',
                background: isSelected ? 'var(--rose-100)' : 'white',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                boxShadow: isSelected ? '0 0 10px rgba(244, 63, 94, 0.25)' : 'none'
              }}
              title={emoji}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
