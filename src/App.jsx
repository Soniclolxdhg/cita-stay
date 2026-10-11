import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { Plus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { deduplicateAccommodations } from './utils/formatters';

export default function App() {
  // Determine Space ID purely from URL param ?space=XYZ or localStorage without side-effects (Fixes Q5)
  const [spaceId, setSpaceId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('space');
    if (fromUrl) {
      return fromUrl.toUpperCase().trim();
    }
    return localStorage.getItem('cita_space_id') || 'AMOR-2026';
  });

  // Partner identity for this device (p1 or p2) without side-effects (Fixes Q5)
  const [currentPartnerId, setCurrentPartnerId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const partnerFromUrl = params.get('partner') || params.get('join');
    if (partnerFromUrl === 'p2' || partnerFromUrl === 'p1') {
      return partnerFromUrl;
    }
    return localStorage.getItem('cita_partner_id') || 'p1';
  });

  // S1, S2: Authentication state (Does NOT blindly authenticate if PIN is required)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedSpace = (params.get('space') || '').toUpperCase().trim();

    // If demo space, auto-authenticate
    if (requestedSpace === 'AMOR-2026' || (!requestedSpace && localStorage.getItem('cita_space_id') === 'AMOR-2026')) {
      return true;
    }

    // Check if device already holds an authenticated session token for this space
    const targetSpace = requestedSpace || localStorage.getItem('cita_space_id');
    if (targetSpace && localStorage.getItem(`cita_token_${targetSpace}`)) {
      return true;
    }

    return localStorage.getItem('cita_authenticated') === 'true' && Boolean(localStorage.getItem('cita_space_id'));
  });

  // Persist session metadata safely in useEffect (Fixes Q5)
  useEffect(() => {
    if (spaceId) {
      localStorage.setItem('cita_space_id', spaceId);
    }
    if (currentPartnerId) {
      localStorage.setItem('cita_partner_id', currentPartnerId);
    }
    if (isAuthenticated) {
      localStorage.setItem('cita_authenticated', 'true');
    }
  }, [spaceId, currentPartnerId, isAuthenticated]);

  // Space data state with instant offline cache hydration
  const [spaceData, setSpaceData] = useState(() => {
    try {
      const cached = localStorage.getItem(`cita_cache_${spaceId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}

    return {
      id: spaceId,
      name: 'Nuestra Escapada Romántica 💕',
      nights: 3,
      currency: 'CLP',
      partners: {
        partner1: { id: 'p1', name: 'Pareja 1', avatar: '🌸', color: '#F472B6' },
        partner2: { id: 'p2', name: 'Pareja 2', avatar: '🐻', color: '#818CF8' }
      },
      accommodations: []
    };
  });

  // Tombstones for intentionally deleted accommodations (Fixes D1)
  const [deletedAccIds, setDeletedAccIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`cita_deleted_${spaceId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markAccDeleted = (accId) => {
    setDeletedAccIds((prev) => {
      const next = prev.includes(accId) ? prev : [...prev, accId];
      try {
        localStorage.setItem(`cita_deleted_${spaceId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Helper to synchronously update React state and cache
  const updateSpaceData = (updater, shouldSync = false) => {
    setSpaceData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      try {
        localStorage.setItem(`cita_cache_${next.id || spaceId}`, JSON.stringify(next));
      } catch {}
      if (shouldSync) {
        syncSpaceToServer(next);
      }
      return next;
    });
  };

  // Push local state to server cache
  const syncSpaceToServer = async (payload) => {
    try {
      const token = localStorage.getItem(`cita_token_${spaceId}`);
      await fetch(`/api/space/${spaceId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...payload,
          deletedAccIds
        })
      });
    } catch (err) {
      console.warn('Sync to backend failed:', err);
    }
  };

  const [loading, setLoading] = useState(false);

  // Filters & Views
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [viewMode, setViewMode] = useState('grid');

  // Modals & Editing
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAccommodation, setEditingAccommodation] = useState(null); // U5: Edit mode
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeCommentItem, setActiveCommentItem] = useState(null);

  // Q4: Toast notification with timer cleanup
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);

  const showToast = useCallback((msg) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage('');
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

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
      } catch {}
    }
    const newUrl = window.location.pathname + '?space=' + newSpaceId;
    window.history.pushState({ path: newUrl }, '', newUrl);

    // If Partner 1 created the space, open invite modal immediately
    if (partnerId === 'p1') {
      setTimeout(() => setIsShareModalOpen(true), 400);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('cita_authenticated');
    localStorage.removeItem(`cita_token_${spaceId}`);
  };

  const handleExploreDemo = () => {
    handleLoginSuccess('AMOR-2026', 'p1');
  };

  // D1, D2: Fetch space data with Last-Write-Wins and strict tombstone respect (No item resurrection)
  const loadSpaceData = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch(`/api/space/${spaceId}`);
      if (res.ok) {
        const serverData = await res.json();
        
        setSpaceData((localData) => {
          if (!serverData || !serverData.id) return localData;

          // Merge deleted tombstones
          const serverDeleted = Array.isArray(serverData.deletedAccIds) ? serverData.deletedAccIds : [];
          const combinedDeleted = new Set([...deletedAccIds, ...serverDeleted]);

          // Update deletedAccIds in state if server had new tombstones
          if (serverDeleted.some(id => !deletedAccIds.includes(id))) {
            setDeletedAccIds(Array.from(combinedDeleted));
            try {
              localStorage.setItem(`cita_deleted_${spaceId}`, JSON.stringify(Array.from(combinedDeleted)));
            } catch {}
          }

          // 1. Partners merge
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

          // 2. Accommodations LWW Merge with Content Deduplication
          const serverAccs = Array.isArray(serverData.accommodations) ? serverData.accommodations : [];
          const localAccs = Array.isArray(localData.accommodations) ? localData.accommodations : [];

          const accMap = new Map();

          // Existing local items first (if not deleted)
          for (const acc of localAccs) {
            if (acc && acc.id && !combinedDeleted.has(acc.id)) {
              accMap.set(acc.id, acc);
            }
          }

          // Server items merged with Last-Write-Wins and content fingerprint reconciliation
          for (const sAcc of serverAccs) {
            if (!sAcc || !sAcc.id || combinedDeleted.has(sAcc.id)) continue;
            
            // Check if server item matches any local item by ID or content fingerprint
            let matchKey = sAcc.id;
            if (!accMap.has(sAcc.id)) {
              for (const [key, lAcc] of accMap.entries()) {
                if (
                  lAcc.title && sAcc.title &&
                  lAcc.title.trim().toLowerCase() === sAcc.title.trim().toLowerCase() &&
                  (
                    (lAcc.link && sAcc.link && lAcc.link === sAcc.link) ||
                    (lAcc.imageUrl && sAcc.imageUrl && lAcc.imageUrl === sAcc.imageUrl) ||
                    (lAcc.location && sAcc.location && lAcc.location.trim().toLowerCase() === sAcc.location.trim().toLowerCase())
                  )
                ) {
                  matchKey = key;
                  break;
                }
              }
            }

            if (!accMap.has(matchKey)) {
              accMap.set(sAcc.id, sAcc);
            } else {
              const lAcc = accMap.get(matchKey);
              const sTime = new Date(sAcc.updatedAt || 0).getTime();
              const lTime = new Date(lAcc.updatedAt || 0).getTime();

              const base = sTime >= lTime ? { ...lAcc, ...sAcc } : { ...sAcc, ...lAcc };

              // Merge comments by unique id
              const commentMap = new Map();
              for (const c of (lAcc.comments || [])) {
                if (c && (c.id || c.text)) commentMap.set(c.id || `${c.partnerId}_${c.text}`, c);
              }
              for (const c of (sAcc.comments || [])) {
                if (c && (c.id || c.text)) commentMap.set(c.id || `${c.partnerId}_${c.text}`, c);
              }
              const mergedComments = Array.from(commentMap.values()).sort(
                (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
              );

              // If matchKey was a different local temporary ID, delete it so server ID takes precedence
              if (matchKey !== sAcc.id) {
                accMap.delete(matchKey);
              }

              accMap.set(sAcc.id, {
                ...base,
                id: sAcc.id,
                reactions: {
                  p1: (sAcc.reactions?.p1?.liked !== undefined ? sAcc.reactions.p1 : lAcc.reactions?.p1) || { liked: false, note: '' },
                  p2: (sAcc.reactions?.p2?.liked !== undefined ? sAcc.reactions.p2 : lAcc.reactions?.p2) || { liked: false, note: '' }
                },
                comments: mergedComments
              });
            }
          }

          const mergedAccs = deduplicateAccommodations(Array.from(accMap.values()));

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
          } catch {}

          return mergedState;
        });
      }
    } catch (err) {
      console.warn('Backend sync poll failed, offline cache active:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [spaceId, deletedAccIds]);

  // D3: Polling optimization (8s interval, pauses when tab is hidden)
  useEffect(() => {
    if (!isAuthenticated) return;
    loadSpaceData(true);

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return; // Pause polling when tab is in background
      }
      loadSpaceData(false);
    }, 8000);

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

    const token = localStorage.getItem(`cita_token_${spaceId}`);
    fetch(`/api/space/${spaceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(updates)
    }).catch(() => {});
  };

  const handleLinkGoogle = async (googleData) => {
    try {
      const res = await fetch(`/api/space/${spaceId}/link-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: googleData.email,
          name: googleData.name
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.space) {
          updateSpaceData(data.space, true);
          showToast(`¡Espacio respaldado con ${googleData.email}! 🔐💕`);
        }
      }
    } catch (err) {
      console.error('Error linking email:', err);
    }
  };

  // U5: Add or Edit Accommodation
  const handleSaveAccommodation = async (accData) => {
    const now = new Date().toISOString();

    if (editingAccommodation) {
      // Editing existing accommodation
      const updated = {
        ...editingAccommodation,
        ...accData,
        id: editingAccommodation.id,
        updatedAt: now
      };

      updateSpaceData((prev) => ({
        ...prev,
        accommodations: prev.accommodations.map((a) => (a.id === updated.id ? updated : a))
      }), true);

      showToast('¡Alojamiento actualizado con éxito! 💕');

      try {
        await fetch(`/api/space/${spaceId}/accommodations/${updated.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        });
      } catch (err) {
        console.warn('Error saving accommodation edit online:', err);
      }
    } else {
      // Adding new accommodation
      const fullItem = {
        id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        ...accData,
        currency: accData.currency || spaceData.currency || 'CLP',
        createdAt: now,
        updatedAt: now,
        reactions: accData.reactions || {
          p1: { liked: currentPartnerId === 'p1', reaction: 'love', note: '', updatedAt: now },
          p2: { liked: currentPartnerId === 'p2', reaction: 'love', note: '', updatedAt: now }
        },
        comments: accData.comments || []
      };

      updateSpaceData((prev) => {
        const withoutDuplicates = prev.accommodations.filter(
          (a) => a.id !== fullItem.id && !(
            a.title && fullItem.title &&
            a.title.trim().toLowerCase() === fullItem.title.trim().toLowerCase() &&
            ((a.link && fullItem.link && a.link === fullItem.link) ||
             (a.imageUrl && fullItem.imageUrl && a.imageUrl === fullItem.imageUrl))
          )
        );
        return {
          ...prev,
          accommodations: deduplicateAccommodations([fullItem, ...withoutDuplicates])
        };
      }, false);

      showToast('¡Alojamiento agregado a la lista! 💕');

      try {
        const res = await fetch(`/api/space/${spaceId}/accommodations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullItem)
        });
        if (res.ok) {
          const savedItem = await res.json();
          if (savedItem && savedItem.id && savedItem.id !== fullItem.id) {
            updateSpaceData((prev) => ({
              ...prev,
              accommodations: deduplicateAccommodations(
                prev.accommodations.map((a) => (a.id === fullItem.id ? savedItem : a))
              )
            }), false);
          }
        }
      } catch (err) {
        console.warn('Network issue adding accommodation, saved locally:', err);
      }
    }

    setEditingAccommodation(null);
    setIsAddModalOpen(false);
  };

  // Toggle reaction (Heart / Note) with timestamp
  const handleToggleReaction = async (accId, reactionPayload) => {
    const now = new Date().toISOString();
    const payloadWithTime = { ...reactionPayload, updatedAt: now };

    updateSpaceData((prev) => {
      const nextAccs = prev.accommodations.map((a) => {
        if (a.id === accId) {
          const currentP1 = a.reactions?.p1 || { liked: false, note: '' };
          const currentP2 = a.reactions?.p2 || { liked: false, note: '' };
          const pKey = reactionPayload.partnerId === 'p2' ? 'p2' : 'p1';

          const updatedReactions = {
            p1: pKey === 'p1' ? { ...currentP1, ...payloadWithTime } : currentP1,
            p2: pKey === 'p2' ? { ...currentP2, ...payloadWithTime } : currentP2
          };

          return { ...a, reactions: updatedReactions, updatedAt: now };
        }
        return a;
      });
      return { ...prev, accommodations: nextAccs };
    }, true);

    try {
      const res = await fetch(`/api/space/${spaceId}/accommodations/${accId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadWithTime)
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

  // Delete accommodation with tombstone (Fixes D1)
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

  // Derived unique accommodations (purges any duplicate cards)
  const uniqueAccommodations = useMemo(() => {
    return deduplicateAccommodations(spaceData.accommodations);
  }, [spaceData.accommodations]);

  // Derived counts
  const matchesCount = useMemo(() => {
    return uniqueAccommodations.filter(
      (a) => a.reactions?.p1?.liked && a.reactions?.p2?.liked
    ).length;
  }, [uniqueAccommodations]);

  const lodgingTypes = useMemo(() => {
    const types = new Set();
    uniqueAccommodations.forEach((a) => {
      if (a.type) types.add(a.type);
    });
    return Array.from(types);
  }, [uniqueAccommodations]);

  // Filtered & Sorted items
  const displayItems = useMemo(() => {
    let items = [...uniqueAccommodations];

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
  }, [uniqueAccommodations, activeFilter, sortBy]);

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
          onOpenAddModal={() => {
            setEditingAccommodation(null);
            setIsAddModalOpen(true);
          }}
          onOpenAiModal={() => setIsAiModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
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
          totalCount={uniqueAccommodations.length}
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
        {loading && uniqueAccommodations.length === 0 ? (
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
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditingAccommodation(null);
                setIsAddModalOpen(true);
              }}
            >
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
                onOpenComments={(targetItem) => setActiveCommentItem(targetItem)}
                onEdit={(targetItem) => {
                  setEditingAccommodation(targetItem);
                  setIsAddModalOpen(true);
                }}
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
            onOpenComments={(targetItem) => setActiveCommentItem(targetItem)}
            onEdit={(targetItem) => {
              setEditingAccommodation(targetItem);
              setIsAddModalOpen(true);
            }}
            onDelete={handleDeleteAccommodation}
          />
        )}
      </div>

      {/* Mobile Bottom Dock for iPhone & Touch Devices */}
      <MobileBottomNav
        currentPartner={spaceData.partners[currentPartnerId === 'p2' ? 'partner2' : 'partner1'] || { name: 'Pareja', avatar: '🌸' }}
        onSwitchPartner={handleSwitchPartner}
        onOpenAddModal={() => {
          setEditingAccommodation(null);
          setIsAddModalOpen(true);
        }}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        matchesCount={matchesCount}
      />

      {/* Add / Edit Accommodation Modal */}
      <AddAccommodationModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingAccommodation(null);
        }}
        onAdd={handleSaveAccommodation}
        currentPartnerId={currentPartnerId}
        currency={spaceData.currency}
        initialItem={editingAccommodation}
      />

      {/* AI Romantic Concierge Modal */}
      <AiConciergeModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        accommodations={spaceData.accommodations}
        nights={spaceData.nights}
        currency={spaceData.currency}
        partners={spaceData.partners}
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
          <span aria-hidden="true">💕</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
