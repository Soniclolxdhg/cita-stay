/**
 * Currency & Price Formatter Utility for Cita Stay
 * Formats prices cleanly according to the selected currency.
 * For CLP, ARS, COP: integers with dot thousands separator (e.g. "CLP $80.000").
 * For USD, EUR: standard formatting (e.g. "USD $135").
 */

export function parseCurrencyNumber(amount, curr = 'USD') {
  if (typeof amount === 'number') return isNaN(amount) ? 0 : amount;
  if (amount === null || amount === undefined || amount === '') return 0;

  const str = String(amount).trim();
  const cleanCurr = (curr || 'USD').toUpperCase().trim();
  const isZeroDecimalCurrency = ['CLP', 'ARS', 'COP'].includes(cleanCurr);

  const hasDot = str.includes('.');
  const hasComma = str.includes(',');

  // Both dot and comma present (e.g. 1.250,50 or 1,250.50)
  if (hasDot && hasComma) {
    if (str.lastIndexOf('.') > str.lastIndexOf(',')) {
      // 1,250.50
      return parseFloat(str.replace(/,/g, '').replace(/[^0-9.-]/g, '')) || 0;
    } else {
      // 1.250,50
      return parseFloat(str.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '')) || 0;
    }
  }

  // Handle zero-decimal currencies (CLP, ARS, COP) where dot or comma is a thousand separator
  if (isZeroDecimalCurrency) {
    const cleanDigitsAndSep = str.replace(/[^0-9.,]/g, '');
    // e.g. "80.000" or "1.500.000" -> 80000 or 1500000
    if (hasDot && !hasComma) {
      const parts = cleanDigitsAndSep.split('.');
      if (parts.length > 1 && parts.slice(1).every(p => p.length === 3)) {
        return parseFloat(parts.join('')) || 0;
      }
    }
    if (hasComma && !hasDot) {
      const parts = cleanDigitsAndSep.split(',');
      if (parts.length > 1 && parts.slice(1).every(p => p.length === 3)) {
        return parseFloat(parts.join('')) || 0;
      }
    }
  }

  // Standard fallback
  return parseFloat(str.replace(/[^0-9.-]+/g, '')) || 0;
}

export function formatCurrencyPrice(amount, curr = 'USD') {
  const cleanCurr = (curr || 'USD').toUpperCase().trim();
  const num = parseCurrencyNumber(amount, cleanCurr);
  const isNoDecimals = ['CLP', 'ARS', 'COP'].includes(cleanCurr);

  let formatted;
  try {
    formatted = isNoDecimals
      ? Math.round(num).toLocaleString('es-CL')
      : num.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  } catch {
    formatted = Math.round(num).toString();
  }

  // Symbol placement
  if (cleanCurr === 'EUR') {
    return `EUR €${formatted}`;
  }
  return `${cleanCurr} $${formatted}`;
}

/**
 * Normalizes any URL string by ensuring it has http:// or https:// prefix
 */
export function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Detects the platform (Instagram, Airbnb, Booking, etc.) for friendly badge display
 */
export function getPlatformInfo(link) {
  const clean = normalizeUrl(link);
  if (!clean) return null;
  const lower = clean.toLowerCase();
  if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
    return { name: 'Instagram', icon: '📸', label: 'Ver en Instagram', color: '#E1306C' };
  }
  if (lower.includes('airbnb.')) {
    return { name: 'Airbnb', icon: '🏠', label: 'Ver en Airbnb', color: '#FF5A5F' };
  }
  if (lower.includes('booking.')) {
    return { name: 'Booking', icon: '🏨', label: 'Ver en Booking', color: '#003580' };
  }
  if (lower.includes('tiktok.com')) {
    return { name: 'TikTok', icon: '🎵', label: 'Ver en TikTok', color: '#000000' };
  }
  return { name: 'Web', icon: '🔗', label: 'Ver Alojamiento', color: 'var(--rose-600)' };
}

/**
 * Deduplicates an array of accommodations by ID, or by content fingerprint (title + link/image/location).
 * Preserves the richest / newest data and merges reactions and comments without losing votes.
 */
export function deduplicateAccommodations(accommodations) {
  if (!Array.isArray(accommodations)) return [];
  const idMap = new Map();
  const contentMap = new Map();

  for (const acc of accommodations) {
    if (!acc) continue;
    const safeId = acc.id ? String(acc.id) : null;
    const cleanTitle = (acc.title || '').trim().toLowerCase();
    const cleanLink = normalizeUrl(acc.link || '').toLowerCase();
    const cleanImg = (acc.imageUrl || '').trim();
    const cleanLoc = (acc.location || '').trim().toLowerCase();

    // Fingerprint represents the real-world place
    const fingerprint = cleanTitle 
      ? `${cleanTitle}:::${cleanLink || cleanImg || cleanLoc}`
      : (safeId || Math.random().toString());

    // Check if seen by safeId or fingerprint
    let existingKey = null;
    if (safeId && idMap.has(safeId)) {
      existingKey = idMap.get(safeId);
    } else if (contentMap.has(fingerprint)) {
      existingKey = contentMap.get(fingerprint);
    }

    if (!existingKey) {
      const key = safeId || ('acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
      const normalizedAcc = { ...acc, id: key };
      if (safeId) idMap.set(safeId, key);
      contentMap.set(fingerprint, key);
      idMap.set(key, normalizedAcc);
    } else {
      const existing = idMap.get(existingKey);
      if (existing) {
        const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const newTime = new Date(acc.updatedAt || acc.createdAt || 0).getTime();
        const base = newTime >= existingTime ? { ...existing, ...acc, id: existing.id } : { ...acc, ...existing, id: existing.id };

        // Merge reactions (so hearts / notes from either duplicate are kept)
        const mergedReactions = {
          p1: (acc.reactions?.p1?.liked !== undefined ? acc.reactions.p1 : existing.reactions?.p1) || { liked: false, note: '' },
          p2: (acc.reactions?.p2?.liked !== undefined ? acc.reactions.p2 : existing.reactions?.p2) || { liked: false, note: '' }
        };
        if (existing.reactions?.p1?.liked || acc.reactions?.p1?.liked) {
          mergedReactions.p1 = { ...(existing.reactions?.p1 || {}), ...(acc.reactions?.p1 || {}), liked: true };
        }
        if (existing.reactions?.p2?.liked || acc.reactions?.p2?.liked) {
          mergedReactions.p2 = { ...(existing.reactions?.p2 || {}), ...(acc.reactions?.p2 || {}), liked: true };
        }

        // Merge comments by id
        const commentMap = new Map();
        for (const c of (existing.comments || [])) {
          if (c && (c.id || c.text)) commentMap.set(c.id || `${c.partnerId}_${c.text}`, c);
        }
        for (const c of (acc.comments || [])) {
          if (c && (c.id || c.text)) commentMap.set(c.id || `${c.partnerId}_${c.text}`, c);
        }
        const mergedComments = Array.from(commentMap.values()).sort(
          (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );

        idMap.set(existingKey, {
          ...base,
          reactions: mergedReactions,
          comments: mergedComments,
          updatedAt: new Date(Math.max(existingTime, newTime, Date.now())).toISOString()
        });
      }
    }
  }

  const uniqueItems = [];
  const seenIds = new Set();
  for (const val of idMap.values()) {
    if (val && typeof val === 'object' && val.id && !seenIds.has(val.id)) {
      seenIds.add(val.id);
      uniqueItems.push(val);
    }
  }
  return uniqueItems;
}
