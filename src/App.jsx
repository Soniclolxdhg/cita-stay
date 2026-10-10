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

  // Space data state with instant offline cache hydration & query param awareness
  const [spaceData, setSpaceData] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const p1Url = params.get('p1');
    const p2Url = params.get('p2');
    const p1AvatarUrl = params.get('p1a');
    const p2AvatarUrl = params.get('p2a');
    const currUrl = params.get('curr');

    try {
      const cached = localStorage.getItem(`cita_cache_${spaceId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (p1Url && (!parsed.partners?.partner1?.name || parsed.partners.partner1.name === 'Pareja 1' || parsed.partners.partner1.name === 'Cami')) {
          parsed.partners.partner1.name = decodeURIComponent(p1Url);
        }
        if (p2Url && (!parsed.partners?.partner2?.name || parsed.partners.partner2.name === 'Pareja 2' || parsed.partners.partner2.name === 'Nico')) {
          parsed.partners.partner2.name = decodeURIComponent(p2Url);
        }
        if (currUrl && (!parsed.currency || parsed.currency === 'USD')) {
          parsed.currency = decodeURIComponent(currUrl);
        }
        return parsed;
      }
    } catch (_) {}

    return {
      id: spaceId,
      name: 'Nuestra Escapada Romántica 💕',
      nights: 3,
      currency: currUrl ? decodeURIComponent(currUrl) : 'CLP',
      partners: {
        partner1: { id: 'p1', name: p1Url ? decodeURIComponent(p1Url) : 'Pareja 1', avatar: p1AvatarUrl ? decodeURIComponent(p1AvatarUrl) : '🌸', color: '#F472B6' },
        partner2: { id: 'p2', name: p2Url ? decodeURIComponent(p2Url) : 'Pareja 2', avatar: p2AvatarUrl ? decodeURIComponent(p2AvatarUrl) : '🐻', color: '#818CF8' }
      },
      accommodations: []
    };
  });

  // Tombstones for intentionally deleted accommodations to avoid resurrection
  const [deletedAccIds, setDeletedAccIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`cita_deleted_${spaceId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const markAccDeleted = (accId) => {
    setDeletedAccIds((prev) => {
      const next = [...prev, accId];
      try {
        localStorage.setItem(`cita_deleted_${spaceId}`, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  // Helper to synchronously update React state, localStorage cache, and optionally sync to backend
  const updateSpaceData = (updater, shouldSync = false) => {
    setSpaceData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      try {
        localStorage.setItem(`cita_cache_${next.id || spaceId}`, JSON.stringify(next));
      } catch (_) {}
      if (shouldSync) {
        syncSpaceToServer(next);
      }
      return next;
    });
  };

  // Push complete local state to server cache
  const syncSpaceToServer = async (payload) => {
    try {
      await fetch(`/api/space/${spaceId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('Sync to backend failed (will retry):', err);
    }
  };

  const [loading, setLoading] = useState(false);

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
      try {
        localStorage.setItem(`cita_cache_${newSpaceId}`, JSON.stringify(initialData));
      } catch (_) {}
      if (initialData.googleOwner) {
        localStorage.setItem('cita_google_user', JSON.stringify(initialData.googleOwner));
      }
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

  // Fetch space data from backend with smart merging and anti-wipe protection
  const loadSpaceData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial && spaceData.accommodations.length === 0) setLoading(true);
      const res = await fetch(`/api/space/${spaceId}`);
      if (res.ok) {
        const serverData = await res.json();
        
        setSpaceData((localData) => {
          if (!serverData || !serverData.id) return localData;

          const deletedSet = new Set(deletedAccIds);

          // 1. Partner names merge: NEVER overwrite custom names with generic ones
          const isGeneric = (n, def) => !n || n === 'Pareja 1' || n === 'Pareja 2' || n === 'Cami' || n === 'Nico' || n === def;
          
          const localP1 = localData.partners?.partner1?.name;
          const serverP1 = serverData.partners?.partner1?.name;
          const finalP1 = !isGeneric(localP1, 'Pareja 1')
            ? localP1
            : (!isGeneric(serverP1, 'Pareja 1') ? serverP1 : (localP1 || serverP1 || 'Pareja 1'));

          const localP2 = localData.partners?.partner2?.name;
          const serverP2 = serverData.partners?.partner2?.name;
          const finalP2 = !isGeneric(localP2, 'Pareja 2')
            ? localP2
            : (!isGeneric(serverP2, 'Pareja 2') ? serverP2 : (localP2 || serverP2 || 'Pareja 2'));

          const mergedPartners = {
            partner1: {
              ...(serverData.partners?.partner1 || {}),
              ...(localData.partners?.partner1 || {}),
              name: finalP1,
              avatar: localData.partners?.partner1?.avatar || serverData.partners?.partner1?.avatar || '🌸',
              color: localData.partners?.partner1?.color || serverData.partners?.partner1?.color || '#F472B6'
            },
            partner2: {
              ...(serverData.partners?.partner2 || {}),
              ...(localData.partners?.partner2 || {}),
              name: finalP2,
              avatar: localData.partners?.partner2?.avatar || serverData.partners?.partner2?.avatar || '🐻',
              color: localData.partners?.partner2?.color || serverData.partners?.partner2?.color || '#818CF8'
            }
          };

          // 2. Accommodations Union Merge (Never drop local items!)
          const serverAccs = Array.isArray(serverData.accommodations) ? serverData.accommodations : [];
          const localAccs = Array.isArray(localData.accommodations) ? localData.accommodations : [];

          const accMap = new Map();

          // Local items first
          for (const acc of localAccs) {
            if (acc && acc.id && !deletedSet.has(acc.id)) {
              accMap.set(acc.id, acc);
            }
          }

          // Server items merged
          for (const sAcc of serverAccs) {
            if (!sAcc || !sAcc.id || deletedSet.has(sAcc.id)) continue;
            if (!accMap.has(sAcc.id)) {
              accMap.set(sAcc.id, sAcc);
            } else {
              const lAcc = accMap.get(sAcc.id);
              accMap.set(sAcc.id, {
                ...lAcc,
                ...sAcc,
                reactions: {
                  p1: sAcc.reactions?.p1?.liked !== undefined ? sAcc.reactions.p1 : lAcc.reactions?.p1,
                  p2: sAcc.reactions?.p2?.liked !== undefined ? sAcc.reactions.p2 : lAcc.reactions?.p2
                },
                comments: (sAcc.comments?.length || 0) >= (lAcc.comments?.length || 0)
                  ? sAcc.comments
                  : (lAcc.comments || [])
              });
            }
          }

          const mergedAccs = Array.from(accMap.values());

          const mergedName = (localData.name && localData.name !== 'Nuestra Escapada Romántica 💕')
            ? localData.name
            : (serverData.name || localData.name || 'Nuestra Escapada Romántica 💕');

          const mergedCurrency = localData.currency || serverData.currency || 'CLP';
          const mergedNights = localData.nights || serverData.nights || 3;

          const mergedState = {
            ...serverData,
            id: spaceId,
            name: mergedName,
            nights: mergedNights,
            currency: mergedCurrency,
            partners: mergedPartners,
            accommodations: mergedAccs
          };

          try {
            localStorage.setItem(`cita_cache_${spaceId}`, JSON.stringify(mergedState));
          } catch (_) {}

          // If server was freshly initialized or missing items that exist locally, re-hydrate server immediately!
          if (serverData._isFreshInit || localAccs.length > serverAccs.length) {
            syncSpaceToServer(mergedState);
          }

          return mergedState;
        });
      }
    } catch (err) {
      console.warn('Backend sync poll failed, offline cache active:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [spaceId, deletedAccIds]);

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

  const handleUpdateTrip = (updates) => {
    updateSpaceData((prev) => ({
      ...prev,
      ...updates
    }), true);

    fetch(`/api/space/${spaceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }).catch(() => {});
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
          updateSpaceData(data.space, true);
          showToast(`¡Espacio vinculado a Google (${googleData.email})! 🔐💕`);
        }
      }
    } catch (err) {
      console.error('Error linking Google:', err);
    }
  };

  // Add accommodation (instant optimistic UI + local-first persistence)
  const handleAddAccommodation = async (newAcc) => {
    const fullItem = {
      id: newAcc.id || 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...newAcc,
      currency: newAcc.currency || spaceData.currency || 'CLP',
      createdAt: new Date().toISOString(),
      reactions: newAcc.reactions || {
        p1: { liked: true, reaction: 'love', note: '' },
        p2: { liked: false, reaction: null, note: '' }
      },
      comments: newAcc.comments || []
    };

    updateSpaceData((prev) => ({
      ...prev,
      accommodations: [fullItem, ...prev.accommodations.filter((a) => a.id !== fullItem.id)]
    }), true);

    showToast('¡Alojamiento agregado a la lista! 💕');

    try {
      await fetch(`/api/space/${spaceId}/accommodations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullItem)
      });
    } catch (err) {
      console.warn('Network issue adding accommodation, saved offline and queued sync:', err);
    }
  };

  // Toggle reaction (Heart / Note)
  const handleToggleReaction = async (accId, reactionPayload) => {
    updateSpaceData((prev) => {
      const nextAccs = prev.accommodations.map((a) => {
        if (a.id === accId) {
          const currentP1 = a.reactions?.p1 || { liked: false, note: '' };
          const currentP2 = a.reactions?.p2 || { liked: false, note: '' };
          const pKey = reactionPayload.partnerId === 'p2' ? 'p2' : 'p1';

          const updatedReactions = {
            p1: pKey === 'p1' ? { ...currentP1, ...reactionPayload } : currentP1,
            p2: pKey === 'p2' ? { ...currentP2, ...reactionPayload } : currentP2
          };

          return { ...a, reactions: updatedReactions };
        }
        return a;
      });
      return { ...prev, accommodations: nextAccs };
    }, true);

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
      console.warn('Error saving reaction online, saved locally:', err);
    }
  };

  // Delete accommodation
  const handleDeleteAccommodation = async (accId) => {
    if (!window.confirm('¿Seguro que quieren eliminar este alojamiento de su lista?')) return;

    markAccDeleted(accId);

    updateSpaceData((prev) => ({
      ...prev,
      accommodations: prev.accommodations.filter((a) => a.id !== accId)
    }), true);

    showToast('Alojamiento eliminado');

    try {
      await fetch(`/api/space/${spaceId}/accommodations/${accId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Error deleting on server:', err);
    }
  };

  // Add Comment
  const handleAddComment = async (accId, commentPayload) => {
    const newComment = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      ...commentPayload,
      createdAt: new Date().toISOString()
    };

    updateSpaceData((prev) => {
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
    }, true);

    try {
      await fetch(`/api/space/${spaceId}/accommodations/${accId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComment)
      });
    } catch (err) {
      console.warn('Error adding comment online, saved locally:', err);
    }
  };

  // Delete Comment
  const handleDeleteComment = async (accId, commentId) => {
    updateSpaceData((prev) => {
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
    }, true);

    try {
      await fetch(`/api/space/${spaceId}/accommodations/${accId}/comment/${commentId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Error deleting comment online, saved locally:', err);
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
        currency={spaceData.currency}
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
