import { getLang, pick } from '../i18n.js';
import { parseValue, formatOhm } from '../utils/ohm.js';
import { renderCircuitSVG } from '../utils/circuit-svg.js';

export const meta = {
  id: 'spreadsheet',
  cssHref: 'css/tools/spreadsheet-solver.css',
  label: { ja: '表計算', en: 'Spreadsheet' },
};

function getT() {
  const lang = getLang();
  return {
    title: pick({ ja: '表抵抗計算機', en: 'Spreadsheet Resistance Calculator' }, lang),
    subtitle: pick({
      ja: 'グリッドに抵抗値を入力（例: 100, 1k, 4.7k）。横方向（同一行内）は直列接続、縦方向（各行同士）は並列接続として計算されます。',
      en: 'Enter resistor values into the grid (e.g. 100, 1k, 4.7k). Resistors in the same row connect in series, and rows connect in parallel.'
    }, lang),
    clearBtn: pick({ ja: 'グリッドをクリア', en: 'Clear Grid' }, lang),
    sampleBtn: pick({ ja: 'サンプルを入力', en: 'Load Sample' }, lang),
    totalLabel: pick({ ja: '合成抵抗（等価抵抗値）', en: 'Total Equivalent Resistance' }, lang),
    rowSeriesHeader: pick({ ja: '行合計', en: 'Row Total' }, lang),
    colHeader: (i) => pick({ ja: `列 ${i + 1}`, en: `Col ${i + 1}` }, lang),
    rowHeader: (i) => pick({ ja: `行 ${i + 1}`, en: `Row ${i + 1}` }, lang),
    diagramTitle: pick({ ja: '回路図', en: 'Circuit Diagram' }, lang),
    diagramNote: pick({
      ja: '各行（横方向）の抵抗は直列接続され、各行同士（縦方向）は並列接続されています。',
      en: 'Resistors in each row are connected in series, and rows are connected in parallel.'
    }, lang),
    emptyNotice: pick({ ja: '抵抗値を1つ以上入力してください。', en: 'Please enter at least one resistor value into the grid.' }, lang),
    invalidWarning: pick({ ja: '無効な入力値が含まれています。', en: 'Some inputs have invalid resistor values.' }, lang),
  };
}

// ---------- Mount / Render Matrix ----------
export function mount(container) {
  const T = getT();
  let tableRows = '';
  // Header row
  tableRows += `<thead><tr><th></th>`;
  for (let c = 0; c < 10; c++) {
    tableRows += `<th>${T.colHeader(c)}</th>`;
  }
  tableRows += `<th class="sp-row-total-th">${T.rowSeriesHeader}</th></tr></thead>`;

  // Body rows
  tableRows += `<tbody>`;
  for (let r = 0; r < 10; r++) {
    tableRows += `<tr><th class="sp-row-lbl">${T.rowHeader(r)}</th>`;
    for (let c = 0; c < 10; c++) {
      tableRows += `<td><input type="text" class="sp-cell" data-row="${r}" data-col="${c}" placeholder="—" autocomplete="off"></td>`;
    }
    tableRows += `<td class="sp-row-total" id="sp-row-total-${r}">—</td></tr>`;
  }
  tableRows += `</tbody>`;

  container.innerHTML = `
    <header class="hero">
      <div>
        <h1>${T.title}</h1>
        <p>${T.subtitle}</p>
      </div>
      <div class="sp-actions">
        <button id="sp-sampleBtn" class="sp-btn sec">${T.sampleBtn}</button>
        <button id="sp-clearBtn" class="sp-btn">${T.clearBtn}</button>
      </div>
    </header>

    <div class="panel sp-grid-panel">
      <div class="sp-table-wrap">
        <table class="sp-table">
          ${tableRows}
        </table>
      </div>
    </div>

    <div class="sp-lcd panel">
      <div class="sp-lcd-title">${T.totalLabel}</div>
      <div class="sp-lcd-value" id="sp-total-val">—</div>
      <div class="sp-lcd-meta" id="sp-total-meta">${T.emptyNotice}</div>
    </div>

    <div class="panel sp-diagram-panel" id="sp-diagram-panel" style="display:none;">
      <div class="sp-diagram-header">
        <h2>${T.diagramTitle}</h2>
        <p class="sp-diagram-note" id="sp-diagram-note">${T.diagramNote}</p>
      </div>
      <div class="sp-diagram-svg" id="sp-diagram-container"></div>
    </div>
  `;

  const inputs = container.querySelectorAll('.sp-cell');
  const totalValEl = container.querySelector('#sp-total-val');
  const totalMetaEl = container.querySelector('#sp-total-meta');
  const diagramPanel = container.querySelector('#sp-diagram-panel');
  const diagramNoteEl = container.querySelector('#sp-diagram-note');
  const diagramContainer = container.querySelector('#sp-diagram-container');
  const clearBtn = container.querySelector('#sp-clearBtn');
  const sampleBtn = container.querySelector('#sp-sampleBtn');

  function calculate() {
    const T_curr = getT();
    const grid = Array.from({ length: 10 }, () => Array(10).fill(null));
    let hasInvalid = false;
    let inputCount = 0;

    inputs.forEach((input) => {
      const r = parseInt(input.dataset.row, 10);
      const c = parseInt(input.dataset.col, 10);
      const str = input.value.trim();
      input.classList.remove('err');
      if (str !== '') {
        const val = parseValue(str);
        if (val !== null && val > 0) {
          grid[r][c] = val;
          inputCount++;
        } else {
          input.classList.add('err');
          hasInvalid = true;
        }
      }
    });

    if (inputCount === 0) {
      totalValEl.textContent = '—';
      totalMetaEl.textContent = hasInvalid ? T_curr.invalidWarning : T_curr.emptyNotice;
      diagramPanel.style.display = 'none';
      diagramContainer.innerHTML = '';
      for (let r = 0; r < 10; r++) {
        const rowValEl = container.querySelector(`#sp-row-total-${r}`);
        rowValEl.textContent = '—';
        rowValEl.classList.remove('active');
      }
      return;
    }

    // Process each row: horizontal resistors in each row connect in series
    const activeRowTrees = [];
    const activeRowSums = [];
    const activeRowMetaExprs = [];

    for (let r = 0; r < 10; r++) {
      const rowValEl = container.querySelector(`#sp-row-total-${r}`);
      const rowResistors = [];
      for (let c = 0; c < 10; c++) {
        if (grid[r][c] !== null) {
          rowResistors.push(grid[r][c]);
        }
      }

      if (rowResistors.length > 0) {
        const sum = rowResistors.reduce((a, b) => a + b, 0);
        rowValEl.textContent = formatOhm(sum);
        rowValEl.classList.add('active');

        activeRowSums.push(sum);
        activeRowMetaExprs.push(rowResistors.map((v) => formatOhm(v)).join(' + '));

        let rowTree;
        if (rowResistors.length === 1) {
          rowTree = { type: 'leaf', value: rowResistors[0] };
        } else {
          rowTree = {
            type: 'series',
            value: sum,
            children: rowResistors.map((v) => ({ type: 'leaf', value: v })),
          };
        }
        activeRowTrees.push(rowTree);
      } else {
        rowValEl.textContent = '—';
        rowValEl.classList.remove('active');
      }
    }

    let totalEquivalent = 0;
    let fullTree = null;

    if (activeRowTrees.length === 1) {
      // Single active row: total equivalent is simply that row's series sum
      totalEquivalent = activeRowSums[0];
      fullTree = activeRowTrees[0];
      totalValEl.textContent = formatOhm(totalEquivalent);
      totalMetaEl.textContent = `R_total = ` + activeRowMetaExprs[0];
    } else {
      // Multiple active rows: connect each row's series sum in parallel
      const reciprocalSum = activeRowSums.reduce((acc, v) => acc + 1 / v, 0);
      totalEquivalent = 1 / reciprocalSum;
      fullTree = { type: 'parallel', value: totalEquivalent, children: activeRowTrees };

      totalValEl.textContent = formatOhm(totalEquivalent);
      totalMetaEl.textContent = `1 / R_total = ` + activeRowSums.map((v) => `1/(${formatOhm(v)})`).join(' + ');
    }

    diagramNoteEl.textContent = T_curr.diagramNote;

    diagramContainer.innerHTML = renderCircuitSVG(fullTree, 'sp');
    diagramPanel.style.display = 'block';
  }

  inputs.forEach((input) => {
    input.addEventListener('input', calculate);
    input.addEventListener('keydown', (e) => {
      const r = parseInt(input.dataset.row, 10);
      const c = parseInt(input.dataset.col, 10);
      let target = null;
      if (e.key === 'ArrowRight' && c < 9) target = container.querySelector(`.sp-cell[data-row="${r}"][data-col="${c + 1}"]`);
      if (e.key === 'ArrowLeft' && c > 0) target = container.querySelector(`.sp-cell[data-row="${r}"][data-col="${c - 1}"]`);
      if (e.key === 'ArrowDown' && r < 9) target = container.querySelector(`.sp-cell[data-row="${r + 1}"][data-col="${c}"]`);
      if (e.key === 'ArrowUp' && r > 0) target = container.querySelector(`.sp-cell[data-row="${r - 1}"][data-col="${c}"]`);
      if (target) {
        target.focus();
        target.select();
      }
    });
  });

  clearBtn.addEventListener('click', () => {
    inputs.forEach((input) => { input.value = ''; input.classList.remove('err'); });
    calculate();
  });

  sampleBtn.addEventListener('click', () => {
    inputs.forEach((input) => { input.value = ''; input.classList.remove('err'); });
    // Sample demonstrating horizontal series and vertical parallel:
    // Row 0: 100, 220
    // Row 1: 330, 470
    container.querySelector('.sp-cell[data-row="0"][data-col="0"]').value = '100';
    container.querySelector('.sp-cell[data-row="0"][data-col="1"]').value = '220';
    container.querySelector('.sp-cell[data-row="1"][data-col="0"]').value = '330';
    container.querySelector('.sp-cell[data-row="1"][data-col="1"]').value = '470';
    calculate();
  });

  // Load sample on initial mount
  sampleBtn.click();
}

export function unmount(container) {}
