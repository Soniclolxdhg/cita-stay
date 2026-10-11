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
