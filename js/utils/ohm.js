/**
 * Resistor value parsing and formatting utilities.
 */

/**
 * Parses a string representing a resistance value into a number.
 * Supports engineering notations like 1k, 4.7k, 1M, 4R7, 100, etc.
 * @param {string} str
 * @returns {number|null}
 */
export function parseValue(str) {
  if (!str) return null;
  str = str.trim().toUpperCase().replace(/Ω|OHM|OHMS/g, '');
  if (str === '') return null;
  let m = str.match(/^([0-9]*\.?[0-9]+)R([0-9]+)$/);
  if (m) return parseFloat(m[1] + '.' + m[2]);
  m = str.match(/^([0-9]*\.?[0-9]+)K([0-9]+)?$/);
  if (m) return parseFloat(m[1] + (m[2] ? '.' + m[2] : '')) * 1e3;
  m = str.match(/^([0-9]*\.?[0-9]+)M([0-9]+)?$/);
  if (m) return parseFloat(m[1] + (m[2] ? '.' + m[2] : '')) * 1e6;
  const v = parseFloat(str);
  return isNaN(v) ? null : v;
}

/**
 * Formats a resistance value to a readable string (e.g. 100 Ω, 4.7 kΩ, 1 MΩ).
 * @param {number} v
 * @param {Object} [options]
 * @param {boolean} [options.space=true] Whether to include a space before the unit.
 * @returns {string}
 */
export function formatOhm(v, { space = true } = {}) {
  if (v === null || v === undefined || !isFinite(v)) return v === Infinity ? '∞' : '—';
  const sp = space ? ' ' : '';
  const abs = Math.abs(v);
  if (abs >= 1e6) return (v / 1e6).toPrecision(4).replace(/\.?0+$/, '') + sp + 'MΩ';
  if (abs >= 1e3) return (v / 1e3).toPrecision(4).replace(/\.?0+$/, '') + sp + 'kΩ';
  return parseFloat(v.toPrecision(5)) + sp + 'Ω';
}

/**
 * Formats resistance value into numeric string and unit object (used in Color Code calculator).
 * @param {number} v
 * @returns {{ num: string, unit: string }}
 */
export function formatOhmsParts(v) {
  if (v >= 1e9) return { num: (v / 1e9).toFixed(v % 1e9 === 0 ? 0 : 2), unit: "GΩ" };
  if (v >= 1e6) return { num: (v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 2), unit: "MΩ" };
  if (v >= 1e3) return { num: (v / 1e3).toFixed(v % 1e3 === 0 ? 0 : 2), unit: "kΩ" };
  if (v < 1) return { num: v.toFixed(2), unit: "Ω" };
  return { num: (Number.isInteger(v) ? v : v.toFixed(2)).toString(), unit: "Ω" };
}
