import { formatOhm } from './ohm.js';

const GEOM = { lead: 16, boxW: 44, boxH: 22, labelH: 13, vGap: 12, stub: 14, margin: 8 };

export function layoutTree(tree) {
  if (tree.type === 'leaf') {
    const width = GEOM.lead * 2 + GEOM.boxW;
    const height = GEOM.labelH + GEOM.boxH;
    const portY = GEOM.labelH + GEOM.boxH / 2;
    return { width, height, portY, node: tree };
  }
  const childLayouts = tree.children.map(layoutTree);
  if (tree.type === 'series') {
    const commonPortY = Math.max.apply(null, childLayouts.map((c) => c.portY));
    const belowMax = Math.max.apply(null, childLayouts.map((c) => c.height - c.portY));
    const height = commonPortY + belowMax;
    let x = 0;
    const placed = childLayouts.map((c) => {
      const item = { layout: c, x, y: commonPortY - c.portY };
      x += c.width;
      return item;
    });
    return { width: x, height, portY: commonPortY, type: 'series', placed, node: tree };
  } else {
    const maxW = Math.max.apply(null, childLayouts.map((c) => c.width));
    let y = 0;
    const placed = childLayouts.map((c, i) => {
      const item = { layout: c, x: GEOM.stub + (maxW - c.width) / 2, y };
      y += c.height + (i < childLayouts.length - 1 ? GEOM.vGap : 0);
      return item;
    });
    const totalHeight = y;
    const width = GEOM.stub * 2 + maxW;
    return { width, height: totalHeight, portY: totalHeight / 2, type: 'parallel', placed, node: tree };
  }
}

export function drawLayout(layout, x, y, classPrefix = 'sp', formatOhmOpts = { space: true }) {
  let svg = '';
  const wireCls = `${classPrefix}-wire`;
  const rboxCls = `${classPrefix}-rbox`;
  const rlabelCls = `${classPrefix}-rlabel`;

  if (layout.node.type === 'leaf') {
    const midY = y + layout.portY;
    const leadEndX = x + GEOM.lead;
    const boxEndX = leadEndX + GEOM.boxW;
    const rightEndX = x + layout.width;
    svg += `<line x1="${x}" y1="${midY}" x2="${leadEndX}" y2="${midY}" class="${wireCls}"/>`;
    svg += `<rect x="${leadEndX}" y="${y + GEOM.labelH}" width="${GEOM.boxW}" height="${GEOM.boxH}" rx="2" class="${rboxCls}"/>`;
    svg += `<line x1="${boxEndX}" y1="${midY}" x2="${rightEndX}" y2="${midY}" class="${wireCls}"/>`;
    svg += `<text x="${leadEndX + GEOM.boxW / 2}" y="${y + GEOM.labelH - 3}" class="${rlabelCls}" text-anchor="middle">${formatOhm(layout.node.value, formatOhmOpts)}</text>`;
    return svg;
  }
  if (layout.type === 'series') {
    layout.placed.forEach((p) => { svg += drawLayout(p.layout, x + p.x, y + p.y, classPrefix, formatOhmOpts); });
    return svg;
  }
  const leftBusX = x + GEOM.stub;
  const rightBusX = x + layout.width - GEOM.stub;
  const portAbsY = y + layout.portY;
  let minY = Infinity, maxY = -Infinity;
  layout.placed.forEach((p) => {
    const branchY = y + p.y + p.layout.portY;
    minY = Math.min(minY, branchY); maxY = Math.max(maxY, branchY);
    svg += `<line x1="${leftBusX}" y1="${branchY}" x2="${x + p.x}" y2="${branchY}" class="${wireCls}"/>`;
    svg += `<line x1="${x + p.x + p.layout.width}" y1="${branchY}" x2="${rightBusX}" y2="${branchY}" class="${wireCls}"/>`;
    svg += drawLayout(p.layout, x + p.x, y + p.y, classPrefix, formatOhmOpts);
  });
  minY = Math.min(minY, portAbsY); maxY = Math.max(maxY, portAbsY);
  svg += `<line x1="${leftBusX}" y1="${minY}" x2="${leftBusX}" y2="${maxY}" class="${wireCls}"/>`;
  svg += `<line x1="${rightBusX}" y1="${minY}" x2="${rightBusX}" y2="${maxY}" class="${wireCls}"/>`;
  svg += `<line x1="${x}" y1="${portAbsY}" x2="${leftBusX}" y2="${portAbsY}" class="${wireCls}"/>`;
  svg += `<line x1="${rightBusX}" y1="${portAbsY}" x2="${x + layout.width}" y2="${portAbsY}" class="${wireCls}"/>`;
  return svg;
}

export function renderCircuitSVG(tree, classPrefix = 'sp', formatOhmOpts = { space: true }) {
  if (!tree) return '';
  const root = layoutTree(tree);
  const m = GEOM.margin;
  const body = drawLayout(root, m, m, classPrefix, formatOhmOpts);
  const w = root.width + m * 2;
  const h = root.height + m * 2;
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;
}
