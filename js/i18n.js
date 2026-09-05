// Shared language management for every tool module.
function detectInitialLanguage() {
  try {
    const saved = localStorage.getItem('resistor_toolkit_lang');
    if (saved === 'ja' || saved === 'en') return saved;
  } catch (e) {}

  const userLangs = (navigator.languages && navigator.languages.length > 0)
    ? navigator.languages
    : [navigator.language || navigator.userLanguage || 'en'];

  const primaryLang = (userLangs[0] || '').toLowerCase();
  return primaryLang.startsWith('ja') ? 'ja' : 'en';
}

let currentLang = detectInitialLanguage();
const listeners = new Set();

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (lang !== 'ja' && lang !== 'en') return;
  if (currentLang === lang) return;
  currentLang = lang;
  try {
    localStorage.setItem('resistor_toolkit_lang', lang);
  } catch (e) {}
  document.documentElement.lang = currentLang;
  listeners.forEach(cb => cb(currentLang));
}

export function onLangChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function pick(dict, lang = currentLang) {
  if (!dict) return '';
  return dict[lang] ?? dict.en ?? '';
}
