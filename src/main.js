import { loadBlocks, saveBlocks, uid, DIRECTIONS } from './blockRegistry.js';

const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');
const shell = document.getElementById('canvasShell');

const els = {
  simulation: document.getElementById('simulation'),
  statGen: document.getElementById('statGen'),
  statPop: document.getElementById('statPop'),
  statWorld: document.getElementById('statWorld'),
  statusPill: document.getElementById('statusPill'),
  statusText: document.getElementById('statusText'),
  speedSlider: document.getElementById('speedSlider'),
  speedValue: document.getElementById('speedValue'),
  pauseBtn: document.getElementById('pauseBtn'),
  resetBtn: document.getElementById('resetBtn'),
  newWorldBtn: document.getElementById('newWorldBtn'),
  blockSettingsBtn: document.getElementById('blockSettingsBtn'),
  setupModal: document.getElementById('setupModal'),
  worldModal: document.getElementById('worldModal'),
  blockModal: document.getElementById('blockModal'),
  openWorldBtn: document.getElementById('openWorldBtn'),
  openBlockBtn: document.getElementById('openBlockBtn'),
  rowsInput: document.getElementById('rowsInput'),
  colsInput: document.getElementById('colsInput'),
  densityInput: document.getElementById('densityInput'),
  densityValue: document.getElementById('densityValue'),
  generateWorldBtn: document.getElementById('generateWorldBtn'),
  cancelWorldBtn: document.getElementById('cancelWorldBtn'),
  blockList: document.getElementById('blockList'),
  addBlockBtn: document.getElementById('addBlockBtn'),
  exportBlocksBtn: document.getElementById('exportBlocksBtn'),
  backBlockBtn: document.getElementById('backBlockBtn'),
};

const ADD_PALETTE = ['#f76b15', '#12a594', '#8e4ec6', '#5b5bd6', '#e93b82', '#087ea4'];

let blocks = loadBlocks();
let rows = 18;
let cols = 26;
let density = 22;
let grid = new Uint8Array(0);
let prevGrid = new Uint8Array(0);
let gen = 0;
let running = false;
let worldActive = false;
let stepDelay = 101;
let acc = 0;
let lastTime = performance.now();
let cellPx = 16;
let needsResize = true;
let modalFrom = 'setup';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const blockOf = (v) => blocks[(v - 1) % blocks.length];
const dirOf = (v) => DIRECTIONS[blockOf(v).direction] || DIRECTIONS.right;

function openModal(m) {
  m.classList.remove('hidden');
}

function closeModal(m) {
  m.classList.add('hidden');
}

function setStatus(active) {
  els.statusText.textContent = active ? 'LIVE' : 'PAUSED';
  els.statusPill.classList.toggle('is-paused', !active);
}

function updateStats() {
  let pop = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i] !== 0) pop++;
  els.statGen.textContent = String(gen).padStart(5, '0');
  els.statPop.textContent = String(pop);
  els.statWorld.textContent = worldActive ? `${rows}×${cols}` : '—';
}

function randomize() {
  grid = new Uint8Array(rows * cols);
  for (let i = 0; i < grid.length; i++) {
    if (Math.random() * 100 < density) {
      grid[i] = 1 + Math.floor(Math.random() * blocks.length);
    }
  }
  prevGrid = grid.slice();
}

function generateWorld() {
  rows = clamp(Math.round(Number(els.rowsInput.value) || 18), 8, 200);
  cols = clamp(Math.round(Number(els.colsInput.value) || 26), 8, 200);
  density = clamp(Number(els.densityInput.value) || 22, 5, 45);

  gen = 0;
  randomize();
  worldActive = true;
  running = true;
  acc = 0;
  needsResize = true;

  els.pauseBtn.textContent = '暂停';
  setStatus(true);
  updateStats();

  closeModal(els.worldModal);
  closeModal(els.setupModal);
  els.simulation.classList.remove('hidden');
}

function step() {
  const next = new Uint8Array(rows * cols);

  blocks.forEach((block, bi) => {
    const v = bi + 1;
    const { dr, dc } = DIRECTIONS[block.direction] || DIRECTIONS.right;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r * cols + c] !== v) continue;
        const tr = (r + dr + rows) % rows;
        const tc = (c + dc + cols) % cols;
        const tIdx = tr * cols + tc;
        if (grid[tIdx] === 0 && next[tIdx] === 0) {
          next[tIdx] = v;
        } else {
          next[r * cols + c] = v;
        }
      }
    }
  });

  prevGrid = grid;
  grid = next;
  gen += 1;
}

function resizeCanvas() {
  needsResize = false;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const availW = Math.max(280, shell.clientWidth - 36);
  const availH = clamp(window.innerHeight * 0.62, 300, 780);
  cellPx = Math.max(2, Math.floor(Math.min(availW / cols, availH / rows)));
  const w = cellPx * cols;
  const h = cellPx * rows;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawRounded(x, y, size, radius) {
  const r = Math.min(radius, size / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + size, y, x + size, y + size, r);
  ctx.arcTo(x + size, y + size, x, y + size, r);
  ctx.arcTo(x, y + size, x, y, r);
  ctx.arcTo(x, y, x + size, y, r);
  ctx.closePath();
}

function draw(t) {
  if (!worldActive) return;
  if (needsResize) resizeCanvas();

  ctx.clearRect(0, 0, cellPx * cols, cellPx * rows);

  if (cellPx >= 6) {
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      ctx.moveTo(c * cellPx + 0.5, 0);
      ctx.lineTo(c * cellPx + 0.5, rows * cellPx);
    }
    for (let r = 0; r <= rows; r++) {
      ctx.moveTo(0, r * cellPx + 0.5);
      ctx.lineTo(cols * cellPx, r * cellPx + 0.5);
    }
    ctx.stroke();
  }

  const inset = Math.max(1, cellPx * 0.1);
  const size = Math.max(1, cellPx - inset * 2);
  const radius = Math.max(1, cellPx * 0.16);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const v = grid[idx];
      if (v === 0) continue;

      let sr = r;
      let sc = c;
      if (prevGrid[idx] !== v) {
        const { dr, dc } = dirOf(v);
        const pr = (r - dr + rows) % rows;
        const pc = (c - dc + cols) % cols;
        if (prevGrid[pr * cols + pc] === v) {
          sr = pr;
          sc = pc;
        }
      }

      let dR = r - sr;
      if (dR > rows / 2) dR -= rows;
      if (dR < -rows / 2) dR += rows;
      let dC = c - sc;
      if (dC > cols / 2) dC -= cols;
      if (dC < -cols / 2) dC += cols;

      const gr = sr + dR * t;
      const gc = sc + dC * t;

      ctx.fillStyle = blockOf(v).color;
      drawRounded(gc * cellPx + inset, gr * cellPx + inset, size, radius);
      ctx.fill();
    }
  }
}

function frame(now) {
  const dt = Math.min(100, now - lastTime);
  lastTime = now;

  if (running && worldActive) {
    acc += dt;
    let guard = 0;
    while (acc >= stepDelay && guard < 8) {
      step();
      acc -= stepDelay;
      guard++;
    }
    if (acc > stepDelay) acc = 0;
    updateStats();
  }

  draw(running && worldActive ? Math.min(1, acc / stepDelay) : 1);
  requestAnimationFrame(frame);
}

function togglePause() {
  if (!worldActive) return;
  running = !running;
  els.pauseBtn.textContent = running ? '暂停' : '继续';
  setStatus(running);
}

function resetWorld() {
  if (!worldActive) return;
  gen = 0;
  randomize();
  updateStats();
}

function updateSpeed() {
  const v = Number(els.speedSlider.value);
  stepDelay = 200 - v * 1.8;
  els.speedValue.textContent = String(v).padStart(3, '0');
}

function applyDensityLabel() {
  els.densityValue.textContent = `${els.densityInput.value}%`;
}

function renderBlockList() {
  els.blockList.innerHTML = '';

  blocks.forEach((block, i) => {
    const row = document.createElement('div');
    row.className = 'block-row';

    const color = document.createElement('input');
    color.type = 'color';
    color.value = block.color;
    color.addEventListener('input', () => {
      block.color = color.value;
      saveBlocks(blocks);
    });

    const name = document.createElement('input');
    name.type = 'text';
    name.value = block.label;
    name.maxLength = 20;
    name.addEventListener('change', () => {
      block.label = name.value.trim() || block.label;
      name.value = block.label;
      saveBlocks(blocks);
    });

    const dir = document.createElement('select');
    Object.entries(DIRECTIONS).forEach(([key, d]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${d.arrow} ${key.toUpperCase()}`;
      dir.appendChild(opt);
    });
    dir.value = block.direction;
    dir.addEventListener('change', () => {
      block.direction = dir.value;
      saveBlocks(blocks);
      renderBlockList();
    });

    row.appendChild(color);
    row.appendChild(name);
    row.appendChild(dir);

    if (blocks.length > 1) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'block-del';
      del.textContent = '×';
      del.title = '删除此方块';
      del.addEventListener('click', () => {
        blocks.splice(i, 1);
        saveBlocks(blocks);
        renderBlockList();
      });
      row.appendChild(del);
    }

    const rule = document.createElement('p');
    rule.className = 'block-rule';
    rule.textContent = DIRECTIONS[block.direction].desc;
    row.appendChild(rule);

    els.blockList.appendChild(row);
  });
}

function addBlock() {
  blocks.push({
    id: uid(),
    label: `方块 ${blocks.length + 1}`,
    color: ADD_PALETTE[blocks.length % ADD_PALETTE.length],
    direction: 'right',
  });
  saveBlocks(blocks);
  renderBlockList();
}

function exportBlocks() {
  const data = {
    app: 'cellular-automata',
    version: 1,
    exportedAt: new Date().toISOString(),
    blocks,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'cellular-automata-blocks.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

els.openWorldBtn.addEventListener('click', () => {
  modalFrom = 'setup';
  openModal(els.worldModal);
});
els.openBlockBtn.addEventListener('click', () => {
  modalFrom = 'setup';
  renderBlockList();
  openModal(els.blockModal);
});
els.generateWorldBtn.addEventListener('click', generateWorld);
els.cancelWorldBtn.addEventListener('click', () => {
  closeModal(els.worldModal);
  if (modalFrom === 'setup') openModal(els.setupModal);
});
els.backBlockBtn.addEventListener('click', () => {
  closeModal(els.blockModal);
  if (modalFrom === 'setup') openModal(els.setupModal);
});
els.addBlockBtn.addEventListener('click', addBlock);
els.exportBlocksBtn.addEventListener('click', exportBlocks);
els.newWorldBtn.addEventListener('click', () => {
  modalFrom = 'sim';
  openModal(els.worldModal);
});
els.blockSettingsBtn.addEventListener('click', () => {
  modalFrom = 'sim';
  renderBlockList();
  openModal(els.blockModal);
});
els.pauseBtn.addEventListener('click', togglePause);
els.resetBtn.addEventListener('click', resetWorld);
els.speedSlider.addEventListener('input', updateSpeed);
els.densityInput.addEventListener('input', applyDensityLabel);

new ResizeObserver(() => {
  needsResize = true;
}).observe(shell);
window.addEventListener('resize', () => {
  needsResize = true;
});

applyDensityLabel();
updateSpeed();
els.statusText.textContent = 'READY';
requestAnimationFrame(frame);
