import { getLang, pick } from '../i18n.js';
import { formatOhmsParts as formatOhms } from '../utils/ohm.js';

export const meta = {
  id: 'color-code',
  cssHref: 'css/tools/color-code.css',
  label: { ja: 'カラーコード', en: 'Color Code' },
};

function getT() {
  const lang = getLang();
  return {
    title1: pick({ ja: "抵抗", en: "Resistor " }, lang),
    titleSpan: pick({ ja: "カラーコード", en: "Color Code" }, lang),
    title2: pick({ ja: "計算機", en: " Calculator" }, lang),
    subtitle: pick({ ja: "カラーバンドを選択して抵抗値と許容差を即座に読み取ります", en: "Select color bands to instantly read the resistance value and tolerance" }, lang),
    band4: pick({ ja: "4本帯", en: "4 Bands" }, lang),
    band5: pick({ ja: "5本帯", en: "5 Bands" }, lang),
    legendTitle: pick({ ja: "カラーコード早見表", en: "Color Code Quick Reference" }, lang),
    thColor: pick({ ja: "色", en: "Color" }, lang),
    thDigit: pick({ ja: "数字", en: "Digit" }, lang),
    thMult: pick({ ja: "倍率", en: "Multiplier" }, lang),
    thTol: pick({ ja: "許容差", en: "Tolerance" }, lang),
    legendNote: pick({
      ja: "帯の数を切り替えると数字帯の数が変わります（4本帯＝数字2桁、5本帯＝数字3桁）。金・銀は倍率と許容差の両方で使用されます。",
      en: "Switching band count changes digit bands (4-band = 2 digits, 5-band = 3 digits). Gold and Silver are used for multiplier and tolerance."
    }, lang),
    fieldLabels4: [
      pick({ ja: "第1帯（十の位）", en: "Band 1 (1st Digit)" }, lang),
      pick({ ja: "第2帯（一の位）", en: "Band 2 (2nd Digit)" }, lang),
      pick({ ja: "第3帯（倍率）", en: "Band 3 (Multiplier)" }, lang),
      pick({ ja: "第4帯（許容差）", en: "Band 4 (Tolerance)" }, lang),
    ],
    fieldLabels5: [
      pick({ ja: "第1帯（百の位）", en: "Band 1 (1st Digit)" }, lang),
      pick({ ja: "第2帯（十の位）", en: "Band 2 (2nd Digit)" }, lang),
      pick({ ja: "第3帯（一の位）", en: "Band 3 (3rd Digit)" }, lang),
      pick({ ja: "第4帯（倍率）", en: "Band 4 (Multiplier)" }, lang),
      pick({ ja: "第5帯（許容差）", en: "Band 5 (Tolerance)" }, lang),
    ],
    resistance: pick({ ja: "公称抵抗値", en: "Nominal Resistance" }, lang),
    actualRange: pick({ ja: "許容範囲 (実効値)", en: "Tolerance Range" }, lang),
    noTolBand: pick({ ja: "許容差帯なし (±20%)", en: "No Tolerance Band (±20%)" }, lang),
  };
}

const COLORS = {
  black:  { name:{ja:"黒",en:"Black"},   hex:"#26241f", digit:0, mult:1,        tol:null  },
  brown:  { name:{ja:"茶",en:"Brown"},   hex:"#7b4a2c", digit:1, mult:10,       tol:1     },
  red:    { name:{ja:"赤",en:"Red"},     hex:"#cc3b34", digit:2, mult:100,      tol:2     },
  orange: { name:{ja:"橙",en:"Orange"},  hex:"#e07b28", digit:3, mult:1000,     tol:null  },
  yellow: { name:{ja:"黄",en:"Yellow"},  hex:"#f0cf3a", digit:4, mult:10000,    tol:null  },
  green:  { name:{ja:"緑",en:"Green"},   hex:"#3f8f4f", digit:5, mult:100000,   tol:0.5   },
  blue:   { name:{ja:"青",en:"Blue"},    hex:"#3266c2", digit:6, mult:1000000,  tol:0.25  },
  violet: { name:{ja:"紫",en:"Violet"},  hex:"#7c4fae", digit:7, mult:10000000, tol:0.1   },
  gray:   { name:{ja:"灰",en:"Gray"},    hex:"#8f948d", digit:8, mult:100000000,tol:0.05  },
  white:  { name:{ja:"白",en:"White"},   hex:"#eee6d6", digit:9, mult:1000000000, tol:null},
  gold:   { name:{ja:"金",en:"Gold"},    hex:"#c9973f", digit:null, mult:0.1,   tol:5     },
  silver: { name:{ja:"銀",en:"Silver"},  hex:"#b9bcc0", digit:null, mult:0.01,  tol:10    },
  none:   { name:{ja:"無し",en:"None"},  hex:null,      digit:null, mult:null,  tol:20    },
};

function colorName(key){ return pick(COLORS[key].name); }

const DIGIT_KEYS = ["black","brown","red","orange","yellow","green","blue","violet","gray","white"];
const MULT_KEYS  = ["black","brown","red","orange","yellow","green","blue","violet","gray","white","gold","silver"];
const TOL_KEYS   = ["brown","red","green","blue","violet","gray","gold","silver","none"];

function fieldsForBandCount(n, T){
  return n === 5
    ? [
        {role:"digit1", label:T.fieldLabels5[0], keys:DIGIT_KEYS},
        {role:"digit2", label:T.fieldLabels5[1], keys:DIGIT_KEYS},
        {role:"digit3", label:T.fieldLabels5[2], keys:DIGIT_KEYS},
        {role:"mult",   label:T.fieldLabels5[3], keys:MULT_KEYS},
        {role:"tol",    label:T.fieldLabels5[4], keys:TOL_KEYS},
      ]
    : [
        {role:"digit1", label:T.fieldLabels4[0], keys:DIGIT_KEYS},
        {role:"digit2", label:T.fieldLabels4[1], keys:DIGIT_KEYS},
        {role:"mult",   label:T.fieldLabels4[2], keys:MULT_KEYS},
        {role:"tol",    label:T.fieldLabels4[3], keys:TOL_KEYS},
      ];
}

function formatMultiplier(m){
  return m >= 1 ? "×" + m.toLocaleString() : "×" + m;
}

// ---------- mount / unmount ----------
export function mount(container){
  const T = getT();
  container.innerHTML = `
    <header class="hero">
      <div>
        <h1>${T.title1}<span>${T.titleSpan}</span>${T.title2}</h1>
        <p>${T.subtitle}</p>
      </div>
      <div class="toggle" id="cc-bandToggle">
        <button data-bands="4" class="active">${T.band4}</button>
        <button data-bands="5">${T.band5}</button>
      </div>
    </header>

    <div class="cc-layout">
      <main class="cc-main">
        <div class="cc-stage panel">
          <svg id="cc-resistorSvg" viewBox="0 0 640 220" xmlns="http://www.w3.org/2000/svg"></svg>
        </div>
        <div class="cc-bands-panel panel" id="cc-bandsPanel"></div>
        <div class="cc-lcd panel">
          <div class="value" id="cc-lcdValue">— Ω</div>
          <div class="meta" id="cc-lcdMeta"></div>
        </div>
      </main>
      <aside class="cc-aside panel">
        <h2>${T.legendTitle}</h2>
        <table class="cc-legend">
          <thead><tr><th>${T.thColor}</th><th>${T.thDigit}</th><th>${T.thMult}</th><th>${T.thTol}</th></tr></thead>
          <tbody id="cc-legendBody"></tbody>
        </table>
        <p class="cc-leg-note">${T.legendNote}</p>
      </aside>
    </div>
  `;

  const $ = (sel) => container.querySelector(sel);

  let bandCount = 4;
  let state = { digit1:"brown", digit2:"black", digit3:"black", mult:"red", tol:"gold" };

  const bandsPanel = $('#cc-bandsPanel');
  const legendBody = $('#cc-legendBody');
  const lcdValue   = $('#cc-lcdValue');
  const lcdMeta    = $('#cc-lcdMeta');
  const svg        = $('#cc-resistorSvg');

  function buildBandsPanel(){
    const T_curr = getT();
    bandsPanel.innerHTML = "";
    fieldsForBandCount(bandCount, T_curr).forEach(f=>{
      const wrap = document.createElement('div');
      wrap.className = 'cc-band-field';

      const label = document.createElement('label');
      label.textContent = f.label;
      wrap.appendChild(label);

      const sw = document.createElement('div');
      sw.className = 'cc-swatch-select';

      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.id = 'cc-dot-' + f.role;
      sw.appendChild(dot);

      const select = document.createElement('select');
      f.keys.forEach(k=>{
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = colorName(k);
        select.appendChild(opt);
      });
      select.value = state[f.role] && f.keys.includes(state[f.role]) ? state[f.role] : f.keys[0];
      state[f.role] = select.value;
      select.addEventListener('change', ()=>{ state[f.role] = select.value; render(); });
      sw.appendChild(select);
      wrap.appendChild(sw);
      bandsPanel.appendChild(wrap);
    });
  }

  function buildLegend(){
    const rows = DIGIT_KEYS.concat(["gold","silver","none"]);
    legendBody.innerHTML = "";
    rows.forEach(k=>{
      const c = COLORS[k];
      const tr = document.createElement('tr');

      const tdColor = document.createElement('td');
      const box = document.createElement('div');
      box.className = 'cc-leg-color';
      const dot = document.createElement('div');
      dot.className = 'cc-leg-dot';
      dot.style.background = c.hex || 'repeating-linear-gradient(45deg,#333,#333 3px,#111 3px,#111 6px)';
      box.appendChild(dot);
      const txt = document.createElement('span');
      txt.textContent = pick(c.name);
      box.appendChild(txt);
      tdColor.appendChild(box);

      const tdDigit = document.createElement('td');
      tdDigit.textContent = c.digit === null ? "—" : c.digit;

      const tdMult = document.createElement('td');
      tdMult.textContent = c.mult === null ? "—" : formatMultiplier(c.mult);

      const tdTol = document.createElement('td');
      tdTol.textContent = c.tol === null ? "—" : "±" + c.tol + "%";

      tr.append(tdColor, tdDigit, tdMult, tdTol);
      legendBody.appendChild(tr);
    });
  }

  function drawResistor(){
    const T_curr = getT();
    const fields = fieldsForBandCount(bandCount, T_curr);
    const bodyX = 160, bodyW = 320, bodyY = 60, bodyH = 100;
    const leadY = bodyY + bodyH/2;

    let s = "";
    s += `<line x1="0" y1="${leadY}" x2="${bodyX}" y2="${leadY}" stroke="#9a9a92" stroke-width="6" stroke-linecap="round"/>`;
    s += `<line x1="${bodyX+bodyW}" y1="${leadY}" x2="640" y2="${leadY}" stroke="#9a9a92" stroke-width="6" stroke-linecap="round"/>`;
    s += `<defs>
      <linearGradient id="cc-bodyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e4c99a"/>
        <stop offset="45%" stop-color="#d1af79"/>
        <stop offset="100%" stop-color="#a9834f"/>
      </linearGradient>
    </defs>`;
    s += `<rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH}" rx="${bodyH/2}" fill="url(#cc-bodyGrad)" stroke="#5f4726" stroke-width="2"/>`;

    let xs = bandCount === 4
      ? [bodyX+70, bodyX+110, bodyX+150, bodyX+bodyW-46]
      : [bodyX+58, bodyX+94, bodyX+130, bodyX+166, bodyX+bodyW-46];

    fields.forEach((f, i)=>{
      const c = COLORS[state[f.role]];
      const bw = f.role === 'tol' ? 14 : 16;
      const cx = xs[i];
      if(c.hex){
        s += `<rect x="${cx - bw/2}" y="${bodyY-2}" width="${bw}" height="${bodyH+4}" fill="${c.hex}" stroke="rgba(0,0,0,0.25)" stroke-width="1"/>`;
        s += `<rect x="${cx - bw/2}" y="${bodyY-2}" width="${bw/2.2}" height="${bodyH+4}" fill="rgba(255,255,255,0.10)"/>`;
      } else {
        s += `<line x1="${cx}" y1="${bodyY-6}" x2="${cx}" y2="${bodyY}" stroke="#66605033" stroke-width="1" stroke-dasharray="2,2"/>`;
      }
    });
    s += `<ellipse cx="${bodyX+bodyW*0.35}" cy="${bodyY+18}" rx="${bodyW*0.3}" ry="12" fill="rgba(255,255,255,0.18)"/>`;
    svg.innerHTML = s;
  }

  function compute(){
    const T_curr = getT();
    const fields = fieldsForBandCount(bandCount, T_curr);
    let digits = "";
    fields.forEach(f=>{ if(f.role.startsWith('digit')) digits += String(COLORS[state[f.role]].digit); });
    const base = parseInt(digits, 10);
    const mult = COLORS[state.mult].mult;
    return { ohms: base * mult, tol: COLORS[state.tol].tol };
  }

  function render(){
    const T_curr = getT();
    drawResistor();
    const { ohms, tol } = compute();
    const f = formatOhms(ohms);
    const tolLabel = tol === null ? "" : `<small>±${tol}%</small>`;
    lcdValue.innerHTML = `${f.num}<small>${f.unit}</small>${tolLabel}`;

    let rangeText;
    if(tol !== null){
      const lo = ohms * (1 - tol/100), hi = ohms * (1 + tol/100);
      const flo = formatOhms(lo), fhi = formatOhms(hi);
      const dash = getLang() === 'ja' ? '〜' : '–';
      rangeText = `${T_curr.actualRange}: <b>${flo.num}${flo.unit}</b> ${dash} <b>${fhi.num}${fhi.unit}</b>`;
    } else {
      rangeText = T_curr.noTolBand;
    }
    lcdMeta.innerHTML = `${T_curr.resistance}: <b>${ohms.toLocaleString()} Ω</b><br>${rangeText}`;

    Object.keys(state).forEach(role=>{
      const dot = $('#cc-dot-'+role);
      if(dot){
        const c = COLORS[state[role]];
        dot.style.background = c.hex || 'repeating-linear-gradient(45deg,#333,#333 3px,#111 3px,#111 6px)';
      }
    });
  }

  function switchBandCount(n){
    bandCount = n;
    container.querySelectorAll('#cc-bandToggle button').forEach(b=>{
      b.classList.toggle('active', Number(b.dataset.bands) === n);
    });
    buildBandsPanel();
    render();
  }

  $('#cc-bandToggle').addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    switchBandCount(Number(btn.dataset.bands));
  });

  buildLegend();
  buildBandsPanel();
  render();
}

export function unmount(container){}
