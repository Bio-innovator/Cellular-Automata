import { getDefaultBlocks, getBlockById } from './blockRegistry.js';

const setupModal = document.getElementById('setupModal');
const worldModal = document.getElementById('worldModal');
const blockModal = document.getElementById('blockModal');
const simulationSection = document.getElementById('simulationSection');

const rowsInput = document.getElementById('rowsInput');
const colsInput = document.getElementById('colsInput');
const densityInput = document.getElementById('densityInput');
const densityValue = document.getElementById('densityValue');

const speedSlider = document.getElementById('speedSlider');
const gridEl = document.getElementById('grid');

const openWorldBtn = document.getElementById('openWorldBtn');
const openBlockBtn = document.getElementById('openBlockBtn');
const generateWorldBtn = document.getElementById('generateWorldBtn');
const cancelWorldBtn = document.getElementById('cancelWorldBtn');
const saveBlocksBtn = document.getElementById('saveBlocksBtn');
const cancelBlockBtn = document.getElementById('cancelBlockBtn');
const newWorldBtn = document.getElementById('newWorldBtn');
const blockSettingsBtn = document.getElementById('blockSettingsBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

const EMPTY = 0;
const RED = 1;
const BLUE = 2;

let rows = 18;
let cols = 26;
let density = 22;
let running = true;
let timer = null;
let stepDelay = 90;
let worldModalFromSim = false;
let blockColors = {
  red: '#ff6f61',
  blue: '#5c7cff'
};
let grid = [];

function showModal(modal) {
  modal.classList.remove('hidden');
}

function hideModal(modal) {
  modal.classList.add('hidden');
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function applyDensityLabel() {
  densityValue.textContent = `${density}%`;
}

function updateGridSize() {
  const cellSize = clamp(Math.floor(780 / Math.max(rows, cols)), 12, 24);
  document.documentElement.style.setProperty('--cell-size', `${cellSize}px`);
  document.documentElement.style.setProperty('--grid-gap', '4px');
}

function buildGrid() {
  gridEl.innerHTML = '';
  gridEl.style.setProperty('--cols', String(cols));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell empty';
      gridEl.appendChild(cell);
    }
  }
}

function createEmptyGrid() {
  return Array.from({ length: rows }, () => Array(cols).fill(EMPTY));
}

function renderGrid() {
  const cells = [...gridEl.children];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const cell = cells[idx];
      const value = grid[r][c];
      cell.className = 'cell';

      if (value === RED) {
        cell.classList.add('red');
      } else if (value === BLUE) {
        cell.classList.add('blue');
      } else {
        cell.classList.add('empty');
      }
    }
  }
}

function renderBlockConfig() {
  const list = document.getElementById('blockConfigList');
  list.innerHTML = '';

  const blocks = getDefaultBlocks();

  blocks.forEach((block) => {
    const row = document.createElement('div');
    row.className = 'block-option';

    const swatch = document.createElement('span');
    swatch.className = 'block-swatch';
    swatch.style.background = blockColors[block.id] || block.color;

    const label = document.createElement('label');
    label.textContent = block.label;

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = blockColors[block.id] || block.color;
    colorInput.dataset.blockId = block.id;

    row.appendChild(swatch);
    row.appendChild(label);
    row.appendChild(colorInput);
    list.appendChild(row);
  });

  list.querySelectorAll('input[type="color"]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const blockId = event.target.dataset.blockId;
      blockColors[blockId] = event.target.value;
      const swatch = event.target.parentElement.querySelector('.block-swatch');
      if (swatch) {
        swatch.style.background = event.target.value;
      }
    });
  });
}

function generateWorld() {
  rows = clamp(Number(rowsInput.value) || 18, 8, 40);
  cols = clamp(Number(colsInput.value) || 26, 8, 60);
  density = clamp(Number(densityInput.value) || 22, 10, 45);

  grid = createEmptyGrid();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const chance = Math.random() * 100;
      if (chance < density) {
        grid[r][c] = Math.random() < 0.5 ? RED : BLUE;
      }
    }
  }

  updateGridSize();
  buildGrid();
  renderGrid();

  hideModal(worldModal);
  showModal(simulationSection);
  hideModal(setupModal);

  running = true;
  pauseBtn.textContent = '暂停';

  if (timer) clearInterval(timer);
  timer = setInterval(step, stepDelay);
}

function step() {
  const next = createEmptyGrid();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const value = grid[r][c];
      if (value === RED) {
        const target = (c + 1) % cols;
        if (grid[r][target] === EMPTY && next[r][target] === EMPTY) {
          next[r][target] = RED;
        } else {
          next[r][c] = RED;
        }
      }
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const value = grid[r][c];
      if (value === BLUE) {
        const target = (r + 1) % rows;
        if (grid[target][c] === EMPTY && next[target][c] === EMPTY) {
          next[target][c] = BLUE;
        } else {
          next[r][c] = BLUE;
        }
      }
    }
  }

  grid = next;
  renderGrid();
}

function resetWorld() {
  grid = createEmptyGrid();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() * 100 < density) {
        grid[r][c] = Math.random() < 0.5 ? RED : BLUE;
      }
    }
  }
  renderGrid();
}

function togglePause() {
  running = !running;
  pauseBtn.textContent = running ? '暂停' : '继续';

  if (running) {
    if (timer) clearInterval(timer);
    timer = setInterval(step, stepDelay);
  } else {
    clearInterval(timer);
    timer = null;
  }
}

function updateSpeed() {
  stepDelay = 180 - Number(speedSlider.value) * 1.2;
  if (stepDelay < 18) stepDelay = 18;

  if (running && timer) {
    clearInterval(timer);
    timer = setInterval(step, stepDelay);
  }
}

function openWorldSetup() {
  worldModalFromSim = false;
  hideModal(setupModal);
  showModal(worldModal);
}

function openBlockSetup() {
  hideModal(setupModal);
  renderBlockConfig();
  showModal(blockModal);
}

function closeWorldSetup() {
  hideModal(worldModal);
  if (worldModalFromSim) {
    showModal(simulationSection);
  } else {
    showModal(setupModal);
  }
}

function closeBlockSetup() {
  hideModal(blockModal);
  showModal(setupModal);
}

function saveBlockConfig() {
  const colorInputs = document.querySelectorAll('#blockConfigList input[type="color"]');
  colorInputs.forEach((input) => {
    const blockId = input.dataset.blockId;
    blockColors[blockId] = input.value;
  });

  document.documentElement.style.setProperty('--red', blockColors.red);
  document.documentElement.style.setProperty('--blue', blockColors.blue);

  hideModal(blockModal);
  showModal(setupModal);
}

openWorldBtn.addEventListener('click', openWorldSetup);
openBlockBtn.addEventListener('click', openBlockSetup);
generateWorldBtn.addEventListener('click', generateWorld);
cancelWorldBtn.addEventListener('click', closeWorldSetup);
cancelBlockBtn.addEventListener('click', closeBlockSetup);
saveBlocksBtn.addEventListener('click', saveBlockConfig);
newWorldBtn.addEventListener('click', () => {
  worldModalFromSim = true;
  hideModal(simulationSection);
  showModal(worldModal);
});
blockSettingsBtn.addEventListener('click', openBlockSetup);
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', resetWorld);
speedSlider.addEventListener('input', updateSpeed);
densityInput.addEventListener('input', (event) => {
  density = Number(event.target.value);
  applyDensityLabel();
});

applyDensityLabel();
showModal(setupModal);
