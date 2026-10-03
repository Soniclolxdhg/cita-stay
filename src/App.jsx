import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AmbientHearts from './components/AmbientHearts';
import Header from './components/Header';
import TripBanner from './components/TripBanner';
import ControlBar from './components/ControlBar';
import AccommodationCard from './components/AccommodationCard';
import ComparisonTable from './components/ComparisonTable';
import AddAccommodationModal from './components/AddAccommodationModal';
import AiConciergeModal from './components/AiConciergeModal';
import CoupleSettingsModal from './components/CoupleSettingsModal';
import CommentsModal from './components/CommentsModal';
import MobileBottomNav from './components/MobileBottomNav';
import AuthScreen from './components/AuthScreen';
import SharePartnerModal from './components/SharePartnerModal';
import { Plus, Sparkles, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  // Determine Space ID from URL param ?space=XYZ or localStorage
  const [spaceId, setSpaceId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('space');
    if (fromUrl) {
      return fromUrl.toUpperCase().trim();
    }
    const saved = localStorage.getItem('cita_space_id');
    return saved || 'AMOR-2026';
  });

  // Partner identity for this device (p1 or p2) - automatically reads from invite link!
  const [currentPartnerId, setCurrentPartnerId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const partnerFromUrl = params.get('partner') || params.get('join');
    if (partnerFromUrl === 'p2' || partnerFromUrl === 'p1') {
      localStorage.setItem('cita_partner_id', partnerFromUrl);
      return partnerFromUrl;
    }
    return localStorage.getItem('cita_partner_id') || 'p1';
  });

  // Authentication state - automatically authenticates if opening personalized invite link!
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('space') && (params.get('partner') || params.get('join'))) {
      localStorage.setItem('cita_authenticated', 'true');
      localStorage.setItem('cita_space_id', params.get('space').toUpperCase().trim());
      return true;
    }
    return localStorage.getItem('cita_authenticated') === 'true';
  });

  // Custom Gemini API Key (optional)
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('cita_gemini_key') || '';
  });

  // Space data state
  const [spaceData, setSpaceData] = useState({
    id: spaceId,
    name: 'Nuestra Escapada Romántica 💕',
    nights: 3,
    currency: 'USD',
    partners: {
      partner1: { id: 'p1', name: 'Cami', avatar: '🌸', color: '#F472B6' },
      partner2: { id: 'p2', name: 'Nico', avatar: '🐻', color: '#818CF8' }
    },
    accommodations: []
  });

  const [loading, setLoading] = useState(true);

  // Filters & Views
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [viewMode, setViewMode] = useState('grid');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeCommentItem, setActiveCommentItem] = useState(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Login handler
  const handleLoginSuccess = (newSpaceId, partnerId, initialData) => {
    setSpaceId(newSpaceId);
    setCurrentPartnerId(partnerId || 'p1');
    setIsAuthenticated(true);
    localStorage.setItem('cita_authenticated', 'true');
    localStorage.setItem('cita_space_id', newSpaceId);
    localStorage.setItem('cita_partner_id', partnerId || 'p1');
    if (initialData) {
      setSpaceData(initialData);
    }
    const newUrl = window.location.pathname + '?space=' + newSpaceId;
    window.history.pushState({ path: newUrl }, '', newUrl);

    // If Partner 1 just created the space, open the invite modal immediately so they can send the WhatsApp link!
    if (partnerId === 'p1') {
      setTimeout(() => setIsShareModalOpen(true), 400);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('cita_authenticated');
  };

  const handleExploreDemo = () => {
    handleLoginSuccess('AMOR-2026', 'p1');
  };

  // Fetch space data from backend
  const loadSpaceData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await fetch(`/api/space/${spaceId}`);
      if (res.ok) {
        const data = await res.json();
        setSpaceData(data);
      }
    } catch (err) {
      console.warn('Could not sync with backend, using cached state:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [spaceId]);

  // Initial load + Real-time synchronization polling (every 4 seconds)
  useEffect(() => {
    if (!isAuthenticated) return;
    loadSpaceData(true);
    const interval = setInterval(() => {
      loadSpaceData(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [loadSpaceData, isAuthenticated]);

  // Handle partner switcher
  const handleSwitchPartner = () => {
    const nextPartner = currentPartnerId === 'p1' ? 'p2' : 'p1';
    setCurrentPartnerId(nextPartner);
    localStorage.setItem('cita_partner_id', nextPartner);
    const partnerName = spaceData.partners[nextPartner === 'p2' ? 'partner2' : 'partner1']?.name || 'Pareja';
    showToast(`Ahora estás interactuando como ${partnerName} ✨`);
  };

  const handleUpdateTrip = async (updates) => {
    // Optimistic update
    setSpaceData((prev) => ({
      ...prev,
      ...updates
    }));

    try {
      await fetch(`/api/space/${spaceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (err) {
      console.error('Error updating trip config:', err);
    }
  };

  const handleUpdateApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('cita_gemini_key', key);
    showToast('Clave de IA guardada');
  };

  const handleLinkGoogle = async (googleData) => {
    try {
      const res = await fetch(`/api/space/${spaceId}/link-google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: googleData.email,
          name: googleData.name,
          picture: googleData.picture
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.space) {
          setSpaceData(data.space);
          showToast(`¡Espacio vinculado a Google (${googleData.email})! 🔐💕`);
        }
      }
    } catch (err) {
      console.error('Error linking Google:', err);
    }
  };

  // Add accommodation
  const handleAddAccommodation = async (newAcc) => {
    try {
      const res = await fetch(`/api/space/${spaceId}/accommodations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAcc)
      });

      if (res.ok) {
        const added = await res.json();
        setSpaceData((prev) => ({
          ...prev,
          accommodations: [added, ...prev.accommodations]
        }));
        showToast('¡Alojamiento agregado a la lista! 💕');
      }
    } catch (err) {
      console.error('Error adding accommodation:', err);
    }
  };

  // Toggle reaction (Heart / Note)
  const handleToggleReaction = async (accId, reactionPayload) => {
    // Optimistic update
    setSpaceData((prev) => {
      const nextAccs = prev.accommodations.map((a) => {
        if (a.id === accId) {
          const currentP1 = a.reactions?.p1 || { liked: false, note: '' };
          const currentP2 = a.reactions?.p2 || { liked: false, note: '' };
          const pKey = reactionPayload.partnerId === 'p2' ? 'p2' : 'p1';

          const updatedReactions = {
            p1: pKey === 'p1' ? { ...currentP1, ...reactionPayload } : currentP1,
            p2: pKey === 'p2' ? { ...currentP2, ...reactionPayload } : currentP2
          };

          return {
            ...a,
            reactions: updatedReactions
          };
        }
        return a;
      });
      return { ...prev, accommodations: nextAccs };
    });

    try {
      const res = await fetch(`/api/space/${spaceId}/accommodations/${accId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reactionPayload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isMatch) {
          showToast('¡ES UN MATCH! Ambos aman este lugar 💕');
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
      }
    } catch (err) {
      console.error('Error saving reaction:', err);
    }
  };

  // Delete accommodation
  const handleDeleteAccommodation = async (accId) => {
    if (!window.confirm('¿Seguro que quieren eliminar este alojamiento de su lista?')) return;

    setSpaceData((prev) => ({
      ...prev,
      accommodations: prev.accommodations.filter((a) => a.id !== accId)
    }));

    try {
      await fetch(`/api/space/${spaceId}/accommodations/${accId}`, {
        method: 'DELETE'
      });
      showToast('Alojamiento eliminado');
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  // Add Comment
  const handleAddComment = async (accId, commentPayload) => {
    try {
      const res = await fetch(`/api/space/${spaceId}/accommodations/${accId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentPayload)
      });

      if (res.ok) {
        const newComment = await res.json();
        setSpaceData((prev) => {
          const nextAccs = prev.accommodations.map((a) => {
            if (a.id === accId) {
              const updatedComments = [...(a.comments || []), newComment];
              if (activeCommentItem && activeCommentItem.id === accId) {
                setActiveCommentItem({ ...a, comments: updatedComments });
              }
              return { ...a, comments: updatedComments };
            }
            return a;
          });
          return { ...prev, accommodations: nextAccs };
        });
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  // Delete Comment
  const handleDeleteComment = async (accId, commentId) => {
    setSpaceData((prev) => {
      const nextAccs = prev.accommodations.map((a) => {
        if (a.id === accId) {
          const updatedComments = (a.comments || []).filter((c) => c.id !== commentId);
          if (activeCommentItem && activeCommentItem.id === accId) {
            setActiveCommentItem({ ...a, comments: updatedComments });
          }
          return { ...a, comments: updatedComments };
        }
        return a;
      });
      return { ...prev, accommodations: nextAccs };
    });

    try {
      await fetch(`/api/space/${spaceId}/accommodations/${accId}/comment/${commentId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  // Derived counts
  const matchesCount = useMemo(() => {
    return spaceData.accommodations.filter(
      (a) => a.reactions?.p1?.liked && a.reactions?.p2?.liked
    ).length;
  }, [spaceData.accommodations]);

  const lodgingTypes = useMemo(() => {
    const types = new Set();
    spaceData.accommodations.forEach((a) => {
      if (a.type) types.add(a.type);
    });
    return Array.from(types);
  }, [spaceData.accommodations]);

  // Filtered & Sorted items
  const displayItems = useMemo(() => {
    let items = [...spaceData.accommodations];

    // Filter
    if (activeFilter === 'matches') {
      items = items.filter((a) => a.reactions?.p1?.liked && a.reactions?.p2?.liked);
    } else if (activeFilter !== 'all') {
      items = items.filter((a) => a.type === activeFilter);
    }

    // Sort
    if (sortBy === 'price-asc') {
      items.sort((a, b) => a.pricePerNight - b.pricePerNight);
    } else if (sortBy === 'price-desc') {
      items.sort((a, b) => b.pricePerNight - a.pricePerNight);
    } else if (sortBy === 'name') {
      items.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      // 'featured' -> Matches first, then items with any like
      items.sort((a, b) => {
        const matchA = a.reactions?.p1?.liked && a.reactions?.p2?.liked ? 2 : 0;
        const matchB = b.reactions?.p1?.liked && b.reactions?.p2?.liked ? 2 : 0;
        const anyA = a.reactions?.p1?.liked || a.reactions?.p2?.liked ? 1 : 0;
        const anyB = b.reactions?.p1?.liked || b.reactions?.p2?.liked ? 1 : 0;
        return (matchB + anyB) - (matchA + anyA);
      });
    }

    return items;
  }, [spaceData.accommodations, activeFilter, sortBy]);

  // If not logged in / no active space session, show welcoming couple Auth Screen
  if (!isAuthenticated) {
    return (
      <>
        <AmbientHearts />
        <AuthScreen
          initialSpaceId={spaceId}
          onLoginSuccess={handleLoginSuccess}
          onExploreDemo={handleExploreDemo}
        />
      </>
    );
  }

  return (
    <>
      <AmbientHearts />

      <div className="app-container">
        {/* Navigation & Header */}
        <Header
          spaceId={spaceData.id}
          partners={spaceData.partners}
          currentPartnerId={currentPartnerId}
          onSwitchPartner={handleSwitchPartner}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenAiModal={() => setIsAiModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          accommodationsCount={spaceData.accommodations.length}
          matchesCount={matchesCount}
          onLogout={handleLogout}
          onOpenShareModal={() => setIsShareModalOpen(true)}
        />

        {/* Trip Banner & Configuration */}
        <TripBanner
          tripName={spaceData.name}
          nights={spaceData.nights}
          currency={spaceData.currency}
          onUpdateTrip={handleUpdateTrip}
          partners={spaceData.partners}
          totalCount={spaceData.accommodations.length}
          matchesCount={matchesCount}
        />

        {/* Controls, Filters & View Toggle */}
        <ControlBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          matchesCount={matchesCount}
          types={lodgingTypes}
        />

        {/* Content Display: Grid or Table */}
        {loading && spaceData.accommodations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div style={{ fontSize: '2rem', animation: 'pulseGentle 1.5s infinite' }}>💕</div>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Cargando su espacio romántico...</p>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🏰</span>
            <h3>No hay alojamientos con este filtro</h3>
            <p>
              {activeFilter === 'matches'
                ? 'Aún no tienen un lugar donde ambos hayan votado con corazón. ¡Exploren y dejen sus opiniones!'
                : 'Agreguen opciones pegando links de Airbnb, Booking o Instagram para empezar a comparar.'}
            </p>
            <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={16} />
              <span>Agregar Alojamiento con IA</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="cards-grid">
            {displayItems.map((item) => (
              <AccommodationCard
                key={item.id}
                item={item}
                nights={spaceData.nights}
                currency={spaceData.currency}
                partners={spaceData.partners}
                currentPartnerId={currentPartnerId}
                onToggleReaction={handleToggleReaction}
                onOpenComments={(item) => setActiveCommentItem(item)}
                onDelete={handleDeleteAccommodation}
              />
            ))}
          </div>
        ) : (
          <ComparisonTable
            items={displayItems}
            nights={spaceData.nights}
            currency={spaceData.currency}
            partners={spaceData.partners}
            currentPartnerId={currentPartnerId}
            onToggleReaction={handleToggleReaction}
            onOpenComments={(item) => setActiveCommentItem(item)}
            onDelete={handleDeleteAccommodation}
          />
        )}
      </div>

      {/* Mobile Bottom Dock for iPhone & Touch Devices */}
      <MobileBottomNav
        currentPartner={spaceData.partners[currentPartnerId === 'p2' ? 'partner2' : 'partner1'] || { name: 'Pareja', avatar: '🌸' }}
        onSwitchPartner={handleSwitchPartner}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        matchesCount={matchesCount}
      />

      {/* Add Accommodation Modal */}
      <AddAccommodationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddAccommodation}
        currentPartnerId={currentPartnerId}
        currency={spaceData.currency}
        apiKey={apiKey}
      />

      {/* AI Romantic Concierge Modal */}
      <AiConciergeModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        accommodations={spaceData.accommodations}
        nights={spaceData.nights}
        currency={spaceData.currency}
        partners={spaceData.partners}
        apiKey={apiKey}
      />

      {/* Couple Settings Modal */}
      <CoupleSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        spaceId={spaceData.id}
        tripName={spaceData.name}
        partners={spaceData.partners}
        currentPartnerId={currentPartnerId}
        onUpdateTrip={handleUpdateTrip}
        apiKey={apiKey}
        onUpdateApiKey={handleUpdateApiKey}
        googleOwner={spaceData.googleOwner}
        onLinkGoogle={handleLinkGoogle}
      />

      {/* Share & Invite Partner Modal */}
      <SharePartnerModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        spaceId={spaceData.id}
        tripName={spaceData.name}
        partners={spaceData.partners}
        currentPartnerId={currentPartnerId}
      />

      {/* Accommodation Comments Modal */}
      <CommentsModal
        isOpen={!!activeCommentItem}
        onClose={() => setActiveCommentItem(null)}
        item={activeCommentItem}
        currentPartnerId={currentPartnerId}
        partners={spaceData.partners}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
      />

      {/* Mutual Match / Toast alert */}
      {toastMessage && (
        <div className="match-toast">
          <span>💕</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
