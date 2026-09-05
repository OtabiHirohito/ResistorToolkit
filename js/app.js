import { getLang, setLang, onLangChange, pick } from './i18n.js';

// Register every tool here.
const TOOL_REGISTRY = [
  () => import('./tools/color-code.js'),
  () => import('./tools/spreadsheet.js'),
  () => import('./tools/formula-solver.js'),
  () => import('./tools/network-solver.js'),
];

const tabsEl = document.getElementById('tabs');
const langSwitchEl = document.getElementById('langSwitch');
const containerEl = document.getElementById('toolContainer');
const loadedCss = new Set();

let modules = [];   // resolved { meta, mount, unmount } for each registered tool
let current = null; // currently mounted module

function loadCss(href){
  if(!href || loadedCss.has(href)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
  loadedCss.add(href);
}

function renderTabs(activeId){
  const lang = getLang();
  tabsEl.innerHTML = '';
  modules.forEach(mod => {
    const btn = document.createElement('button');
    btn.textContent = pick(mod.meta.label, lang);
    btn.classList.toggle('active', mod.meta.id === activeId);
    btn.addEventListener('click', () => activate(mod.meta.id));
    tabsEl.appendChild(btn);
  });
}

function renderLangSwitch(){
  const currentLang = getLang();
  langSwitchEl.innerHTML = `
    <button data-lang="ja" class="${currentLang === 'ja' ? 'active' : ''}">日本語</button>
    <button data-lang="en" class="${currentLang === 'en' ? 'active' : ''}">English</button>
  `;
}

function activate(id){
  const mod = modules.find(m => m.meta.id === id);
  if(!mod) return;

  if(current?.unmount) current.unmount(containerEl);
  loadCss(mod.meta.cssHref);
  containerEl.innerHTML = '';
  mod.mount(containerEl);
  current = mod;

  renderTabs(id);
  history.replaceState(null, '', '#' + id);
}

async function init(){
  document.documentElement.lang = getLang();
  modules = await Promise.all(TOOL_REGISTRY.map(loader => loader()));

  renderLangSwitch();

  langSwitchEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-lang]');
    if (btn) {
      setLang(btn.dataset.lang);
    }
  });

  onLangChange(() => {
    renderLangSwitch();
    if (current) {
      renderTabs(current.meta.id);
      // Re-mount current tool to refresh all labels in the selected language
      if (current.unmount) current.unmount(containerEl);
      containerEl.innerHTML = '';
      current.mount(containerEl);
    }
  });

  const requested = location.hash.replace('#', '');
  const startId = modules.some(m => m.meta.id === requested) ? requested : modules[0].meta.id;
  activate(startId);
}

window.addEventListener('hashchange', ()=>{
  const id = location.hash.replace('#', '');
  if(modules.some(m => m.meta.id === id)) activate(id);
});

init();
