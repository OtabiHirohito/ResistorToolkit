import { getLang, pick } from '../i18n.js';
import { parseValue, formatOhm } from '../utils/ohm.js';
import { renderCircuitSVG } from '../utils/circuit-svg.js';

export const meta = {
  id: 'formula-solver',
  cssHref: 'css/tools/formula-solver.css',
  label: { ja: '数式', en: 'Formula Calculator' },
};

function getT() {
  const lang = getLang();
  return {
    title: pick({ ja: '数式抵抗計算機', en: 'Resistor Formula Calculator' }, lang),
    subtitle: pick({
      ja: '直列 ( + ) や並列 ( ‖ または || ) を組み合わせた数式を入力すると、合成抵抗値と回路図を自動計算・描画します。',
      en: 'Enter a formula combining series (+) and parallel (‖ or ||) to compute the total resistance and generate its schematic diagram.'
    }, lang),
    labelExpr: pick({
      ja: '計算式（例: 1Ω + (2Ω ‖ 3Ω) または 1k + (2.2k || 4.7k)）',
      en: 'Formula (e.g. 1Ω + (2Ω ‖ 3Ω) or 1k + (2.2k || 4.7k))'
    }, lang),
    placeholder: pick({ ja: '例: 100 + (220 ‖ 330)', en: 'e.g. 100 + (220 ‖ 330)' }, lang),
    calcBtn: pick({ ja: '計算・描画', en: 'Calculate & Draw' }, lang),
    sample1: pick({ ja: '例1: 1Ω + (2Ω ‖ 3Ω)', en: 'Ex 1: 1Ω + (2Ω ‖ 3Ω)' }, lang),
    sample2: pick({ ja: '例2: (100 + 220) ‖ (330 + 470)', en: 'Ex 2: (100 + 220) ‖ (330 + 470)' }, lang),
    sample3: pick({ ja: '例3: (10k + 2.2k || 4.7k) || 1M', en: 'Ex 3: (10k + 2.2k || 4.7k) || 1M' }, lang),
    totalLabel: pick({ ja: '合成抵抗（等価抵抗値）', en: 'Total Equivalent Resistance' }, lang),
    diagramTitle: pick({ ja: '回路図', en: 'Circuit Diagram' }, lang),
    diagramNote: pick({
      ja: '入力された数式の構造に対応する回路図です。',
      en: 'Circuit schematic generated from the parsed expression structure.'
    }, lang),
    errInvalid: pick({
      ja: '数式の解析に失敗しました。構文や括弧の対応を確認してください。',
      en: 'Failed to parse formula. Please check syntax and parentheses.'
    }, lang),
  };
}

// Tokenize and Parse
function tokenize(input) {
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }
    if (ch === '+') {
      tokens.push({ type: 'op', value: '+' });
      i++;
      continue;
    }
    if (ch === '‖' || input.substring(i, i + 2) === '||') {
      tokens.push({ type: 'op', value: '||' });
      i += (ch === '‖' ? 1 : 2);
      continue;
    }
    if (ch === '|' || input.substring(i, i + 2) === '//') {
      tokens.push({ type: 'op', value: '||' });
      i += (input.substring(i, i + 2) === '//' ? 2 : 1);
      continue;
    }
    let j = i;
    while (j < input.length && !/[\s()+‖|/]/.test(input[j])) {
      j++;
    }
    const tokenStr = input.substring(i, j);
    if (tokenStr) {
      const val = parseValue(tokenStr);
      if (val !== null && val > 0) {
        tokens.push({ type: 'num', value: val, raw: tokenStr });
        i = j;
        continue;
      }
    }
    throw new Error(`Invalid token at ${i}`);
  }
  return tokens;
}

function parseFormula(input) {
  const tokens = tokenize(input);
  let pos = 0;

  function peek() { return tokens[pos]; }
  function consume(type, val) {
    const tok = tokens[pos];
    if (!tok) throw new Error('Unexpected end of formula');
    if (type && tok.type !== type) throw new Error(`Expected token type ${type}`);
    if (val && tok.value !== val) throw new Error(`Expected token value ${val}`);
    pos++;
    return tok;
  }

  function parsePrimary() {
    const tok = peek();
    if (!tok) throw new Error('Unexpected end of formula');
    if (tok.type === 'num') {
      consume('num');
      return { type: 'leaf', value: tok.value };
    }
    if (tok.type === 'paren' && tok.value === '(') {
      consume('paren', '(');
      const node = parseExpr();
      consume('paren', ')');
      return node;
    }
    throw new Error(`Unexpected token ${tok.value}`);
  }

  function parseTerm() {
    let left = parsePrimary();
    while (peek() && peek().type === 'op' && peek().value === '||') {
      consume('op', '||');
      const right = parsePrimary();
      const pVal = (left.value * right.value) / (left.value + right.value);
      const children = [];
      if (left.type === 'parallel') children.push(...left.children);
      else children.push(left);
      if (right.type === 'parallel') children.push(...right.children);
      else children.push(right);

      left = { type: 'parallel', value: pVal, children };
    }
    return left;
  }

  function parseExpr() {
    let left = parseTerm();
    while (peek() && peek().type === 'op' && peek().value === '+') {
      consume('op', '+');
      const right = parseTerm();
      const sVal = left.value + right.value;
      const children = [];
      if (left.type === 'series') children.push(...left.children);
      else children.push(left);
      if (right.type === 'series') children.push(...right.children);
      else children.push(right);

      left = { type: 'series', value: sVal, children };
    }
    return left;
  }

  const ast = parseExpr();
  if (pos < tokens.length) throw new Error('Extra tokens remaining');
  return ast;
}

// ---------- Mount ----------
export function mount(container) {
  const T = getT();
  container.innerHTML = `
    <header class="hero">
      <div>
        <h1>${T.title}</h1>
        <p>${T.subtitle}</p>
      </div>
    </header>

    <div class="panel fs-panel">
      <div class="fs-field">
        <label for="fs-input">${T.labelExpr}</label>
        <div class="fs-input-row">
          <input type="text" id="fs-input" class="fs-input" placeholder="${T.placeholder}" value="1Ω + (2Ω ‖ 3Ω)" autocomplete="off">
          <button id="fs-calcBtn">${T.calcBtn}</button>
        </div>
      </div>
      <div class="fs-samples">
        <button class="fs-chip" data-sample="1 + (2 || 3)">${T.sample1}</button>
        <button class="fs-chip" data-sample="(100 + 220) || (330 + 470)">${T.sample2}</button>
        <button class="fs-chip" data-sample="(10k + 2.2k || 4.7k) || 1M">${T.sample3}</button>
      </div>
      <div id="fs-status" class="fs-status"></div>
    </div>

    <div class="fs-lcd panel" id="fs-lcd-panel">
      <div class="fs-lcd-title">${T.totalLabel}</div>
      <div class="fs-lcd-value" id="fs-total-val">—</div>
    </div>

    <div class="panel fs-diagram-panel" id="fs-diagram-panel" style="display:none;">
      <div class="fs-diagram-header">
        <h2>${T.diagramTitle}</h2>
        <p class="fs-diagram-note">${T.diagramNote}</p>
      </div>
      <div class="fs-diagram-svg" id="fs-diagram-container"></div>
    </div>
  `;

  const inputEl = container.querySelector('#fs-input');
  const calcBtn = container.querySelector('#fs-calcBtn');
  const statusEl = container.querySelector('#fs-status');
  const totalValEl = container.querySelector('#fs-total-val');
  const diagramPanel = container.querySelector('#fs-diagram-panel');
  const diagramContainer = container.querySelector('#fs-diagram-container');
  const chips = container.querySelectorAll('.fs-chip');

  function calculate() {
    const T_curr = getT();
    statusEl.textContent = '';
    statusEl.classList.remove('err');

    const expr = inputEl.value.trim();
    if (!expr) {
      totalValEl.textContent = '—';
      diagramPanel.style.display = 'none';
      diagramContainer.innerHTML = '';
      return;
    }

    try {
      const ast = parseFormula(expr);
      totalValEl.textContent = formatOhm(ast.value);
      diagramContainer.innerHTML = renderCircuitSVG(ast, 'fs');
      diagramPanel.style.display = 'block';
    } catch (e) {
      statusEl.textContent = T_curr.errInvalid;
      statusEl.classList.add('err');
      totalValEl.textContent = '—';
      diagramPanel.style.display = 'none';
      diagramContainer.innerHTML = '';
    }
  }

  calcBtn.addEventListener('click', calculate);
  inputEl.addEventListener('input', calculate);
  inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') calculate(); });

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      inputEl.value = chip.dataset.sample;
      calculate();
    });
  });

  calculate();
}

export function unmount(container) {}
