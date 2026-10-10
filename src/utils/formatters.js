/**
 * Currency & Price Formatter Utility for Cita Stay
 * Formats prices cleanly according to the selected currency.
 * For CLP, ARS, COP: integers with dot thousands separator (e.g. "CLP $80.000").
 * For USD, EUR: standard formatting (e.g. "USD $135").
 */
export function formatCurrencyPrice(amount, curr = 'USD') {
  if (amount === null || amount === undefined || amount === '') return `${curr} $0`;
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]+/g, '')) || 0;
  
  const cleanCurr = (curr || 'USD').toUpperCase().trim();
  const isNoDecimals = ['CLP', 'ARS', 'COP'].includes(cleanCurr);

  let formatted;
  try {
    formatted = isNoDecimals
      ? Math.round(num).toLocaleString('es-CL')
      : num.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  } catch (_) {
    formatted = Math.round(num).toString();
  }

  // Symbol placement
  if (cleanCurr === 'EUR') {
    return `EUR €${formatted}`;
  }
  return `${cleanCurr} $${formatted}`;
}
