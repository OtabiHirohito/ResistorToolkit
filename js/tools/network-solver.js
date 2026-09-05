import { getLang, pick } from '../i18n.js';
import { parseValue, formatOhm } from '../utils/ohm.js';
import { renderCircuitSVG } from '../utils/circuit-svg.js';

export const meta = {
  id: 'network-solver',
  cssHref: 'css/tools/network-solver.css',
  label: { ja: '最適抵抗', en: 'Network Solver' },
};

function getT() {
  const lang = getLang();
  return {
    h1: pick({ ja: '最適抵抗チェッカー', en: 'Optimal Resistance Network Solver' }, lang),
    sub: pick({
      ja: '手持ちの抵抗を直列・並列に組み合わせて、目標抵抗値に最も近い接続方法を自動探索します。',
      en: 'Combines your available resistors in series and parallel to find connection topologies closest to your target resistance.'
    }, lang),
    labelResistors: pick({ ja: '手持ちの抵抗値（カンマまたは改行区切り）', en: 'Available Resistors (comma or newline separated)' }, lang),
    resistorsPlaceholder: pick({ ja: '例: 100, 220, 330, 1k, 4.7k', en: 'e.g. 100, 220, 330, 1k, 4.7k' }, lang),
    hintResistors: pick({
      ja: '単位省略でΩ。k / M / R(=Ω) 表記対応（例: 2.2k, 1M, 4R7）。最大8個まで。',
      en: 'Ω assumed if no unit specified. Supports k / M / R (=Ω) notation (e.g. 2.2k, 1M, 4R7). Up to 8 resistors.'
    }, lang),
    labelTarget: pick({ ja: '目標抵抗値', en: 'Target Resistance' }, lang),
    targetPlaceholder: pick({ ja: '例: 470 または 1.5k', en: 'e.g. 470 or 1.5k' }, lang),
    calcBtn: pick({ ja: '計算する', en: 'Calculate' }, lang),
    resultsLabel: pick({ ja: '計算結果（目標値に近い順）', en: 'Calculation Results (Closest to target first)' }, lang),
    footer: pick({
      ja: '‖ は並列接続、+ は直列接続を表します。',
      en: '‖ denotes parallel connection, + denotes series connection.'
    }, lang),
    footerFormula: pick({
      ja: '直列: <code>R1 + R2</code> ／ 並列: <code>R1‖R2 = (R1×R2)/(R1+R2)</code>',
      en: 'Series: <code>R1 + R2</code> / Parallel: <code>R1‖R2 = (R1×R2)/(R1+R2)</code>'
    }, lang),
    best: pick({ ja: '最適', en: 'Closest' }, lang),
    small: pick({ ja: '小', en: 'low' }, lang),
    big: pick({ ja: '大', en: 'high' }, lang),
    errNoResistor: pick({ ja: '抵抗値を1つ以上入力してください。', en: 'Please enter at least one resistor value.' }, lang),
    errTooMany: pick({ ja: '抵抗の数は最大8個までです（組み合わせ数が爆発的に増えるため）。', en: 'Up to 8 resistors are supported (combinations grow exponentially beyond that).' }, lang),
    errBadResistor: (v) => pick({ ja: `抵抗値の形式が正しくありません: "${v}"`, en: `Invalid resistor value: "${v}"` }, lang),
    errBadTarget: pick({ ja: '目標抵抗値の形式が正しくありません。', en: 'Invalid target resistance value.' }, lang),
    calculating: pick({ ja: '計算中…', en: 'Calculating…' }, lang),
    statusDone: (n, m, ms) => pick({
      ja: `${n}個の抵抗から ${m}通りの組み合わせを検討しました（${ms}ms）。`,
      en: `Checked ${m} combinations from ${n} resistors in ${ms}ms.`
    }, lang),
  };
}

// ---------- pure helpers ----------
function solveNetwork(values) {
  const n = values.length;
  const memo = new Array(1 << n);
  const MAX_PER_MASK = 600;

  function roundKey(v) {
    if (!isFinite(v)) return 'inf';
    return v.toPrecision(6);
  }

  for (let mask = 1; mask < (1 << n); mask++) {
    const popcount = mask.toString(2).split('1').length - 1;
    const map = new Map();
    if (popcount === 1) {
      const idx = Math.log2(mask & -mask);
      const v = values[idx];
      map.set(roundKey(v), { value: v, tree: { type: 'leaf', value: v } });
    } else {
      for (let sub = (mask - 1) & mask; sub > 0; sub = (sub - 1) & mask) {
        const comp = mask ^ sub;
        if (comp === 0 || sub >= comp) continue;
        const listA = memo[sub];
        const listB = memo[comp];
        for (const a of listA.values()) {
          for (const b of listB.values()) {
            const sVal = a.value + b.value;
            const sKey = roundKey(sVal);
            if (!map.has(sKey) && map.size < MAX_PER_MASK) {
              map.set(sKey, { value: sVal, tree: { type: 'series', value: sVal, children: [a.tree, b.tree] } });
            }
            if (a.value > 0 && b.value > 0) {
              const pVal = (a.value * b.value) / (a.value + b.value);
              const pKey = roundKey(pVal);
              if (!map.has(pKey) && map.size < MAX_PER_MASK) {
                map.set(pKey, { value: pVal, tree: { type: 'parallel', value: pVal, children: [a.tree, b.tree] } });
              }
            }
          }
          if (map.size >= MAX_PER_MASK) break;
        }
        if (map.size >= MAX_PER_MASK) break;
      }
    }
    memo[mask] = map;
  }

  const all = [];
  for (let mask = 1; mask < (1 << n); mask++) {
    for (const item of memo[mask].values()) all.push(item);
  }
  return all;
}

function treeToText(tree) {
  if (tree.type === 'leaf') return formatOhm(tree.value, { space: false });
  const parts = tree.children.map(treeToText);
  const op = tree.type === 'series' ? ' + ' : ' ‖ ';
  return '(' + parts.join(op) + ')';
}

// ---------- mount / unmount ----------
export function mount(container) {
  const T = getT();
  container.innerHTML = `
    <header class="hero">
      <div>
        <h1>${T.h1}</h1>
        <p>${T.sub}</p>
      </div>
    </header>

    <div class="panel ns-panel">
      <div class="ns-field">
        <label for="ns-resistors">${T.labelResistors}</label>
        <textarea id="ns-resistors" class="ns-input" placeholder="${T.resistorsPlaceholder}">100, 220, 330, 1k</textarea>
        <div class="ns-hint">${T.hintResistors}</div>
      </div>
      <div class="ns-row">
        <div class="ns-field">
          <label for="ns-target">${T.labelTarget}</label>
          <input type="text" id="ns-target" class="ns-input" placeholder="${T.targetPlaceholder}" value="470">
        </div>
        <div class="ns-field ns-field-btn">
          <button id="ns-calcBtn">${T.calcBtn}</button>
        </div>
      </div>
      <div id="ns-status" class="ns-status"></div>
    </div>

    <div id="ns-resultsPanel" class="panel ns-panel" style="display:none;">
      <label>${T.resultsLabel}</label>
      <div class="ns-results" id="ns-results"></div>
    </div>

    <div class="ns-footer">
      <span>${T.footer}</span><br>
      <span>${T.footerFormula}</span>
    </div>
  `;

  const $ = (sel) => container.querySelector(sel);
  const resistorsEl = $('#ns-resistors');
  const targetEl = $('#ns-target');
  const calcBtn = $('#ns-calcBtn');
  const statusEl = $('#ns-status');
  const resultsPanel = $('#ns-resultsPanel');
  const resultsEl = $('#ns-results');

  function run() {
    const T_curr = getT();
    statusEl.className = 'ns-status'; statusEl.textContent = '';
    resultsPanel.style.display = 'none';
    resultsEl.innerHTML = '';

    const rawList = resistorsEl.value.split(/[,\n]/).map((s) => s.trim()).filter((s) => s.length > 0);

    if (rawList.length === 0) {
      statusEl.textContent = T_curr.errNoResistor; statusEl.classList.add('err'); return;
    }
    if (rawList.length > 8) {
      statusEl.textContent = T_curr.errTooMany; statusEl.classList.add('err'); return;
    }

    const values = [];
    for (const r of rawList) {
      const v = parseValue(r);
      if (v === null || v <= 0) {
        statusEl.textContent = T_curr.errBadResistor(r); statusEl.classList.add('err'); return;
      }
      values.push(v);
    }

    const targetRaw = targetEl.value.trim();
    const target = parseValue(targetRaw);
    if (target === null || target <= 0) {
      statusEl.textContent = T_curr.errBadTarget; statusEl.classList.add('err'); return;
    }

    statusEl.textContent = T_curr.calculating;
    calcBtn.disabled = true;

    setTimeout(() => {
      const t0 = performance.now();
      const all = solveNetwork(values);
      const t1 = performance.now();

      all.sort((a, b) => Math.abs(a.value - target) - Math.abs(b.value - target));

      const seen = new Set();
      const top = [];
      for (const item of all) {
        const key = item.value.toPrecision(6);
        if (seen.has(key)) continue;
        seen.add(key);
        top.push(item);
        if (top.length >= 8) break;
      }

      resultsEl.innerHTML = '';
      top.forEach((item, i) => {
        const err = item.value - target;
        const errPct = (err / target * 100);
        const div = document.createElement('div');
        div.className = 'ns-result-item' + (i === 0 ? ' best' : '');
        div.innerHTML = `
          <div class="ns-rtop">
            <div class="ns-rank">${i + 1 === 1 ? '★' : i + 1}</div>
            <div class="ns-rmain">
              <div class="ns-rval">${formatOhm(item.value, { space: false })} ${i === 0 ? '<span class="ns-badge">' + T_curr.best + '</span>' : ''}</div>
            </div>
            <div class="ns-rerr">${err >= 0 ? '+' : ''}${formatOhm(Math.abs(err), { space: false })}${err < 0 ? ' ' + T_curr.small : ' ' + T_curr.big}<br>(${errPct >= 0 ? '+' : ''}${errPct.toFixed(2)}%)</div>
          </div>
          <div class="ns-rdiagram">${renderCircuitSVG(item.tree, 'ns', { space: false })}</div>
          <div class="ns-rexpr">${treeToText(item.tree)}</div>
        `;
        resultsEl.appendChild(div);
      });

      resultsPanel.style.display = top.length ? 'block' : 'none';
      statusEl.className = 'ns-status';
      statusEl.textContent = T_curr.statusDone(values.length, all.length, (t1 - t0).toFixed(0));
      calcBtn.disabled = false;
    }, 20);
  }

  calcBtn.addEventListener('click', run);
  targetEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });

  run(); // run once on mount with default values
}

export function unmount(container) {}
