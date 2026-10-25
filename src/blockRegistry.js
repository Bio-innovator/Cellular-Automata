import { DEFAULT_BLOCKS } from './blocks/red.js';

export const DIRECTIONS = {
  right: { dr: 0, dc: 1, arrow: '→', desc: '每步向右移动一格；目标位置被其他方块占用时原地停留。' },
  down: { dr: 1, dc: 0, arrow: '↓', desc: '每步向下移动一格；目标位置被其他方块占用时原地停留。' },
  left: { dr: 0, dc: -1, arrow: '←', desc: '每步向左移动一格；目标位置被其他方块占用时原地停留。' },
  up: { dr: -1, dc: 0, arrow: '↑', desc: '每步向上移动一格；目标位置被其他方块占用时原地停留。' },
};

const STORAGE_KEY = 'ca-blocks-v1';

export function uid() {
  return 'b' + Math.random().toString(36).slice(2, 9);
}

function sanitize(list) {
  if (!Array.isArray(list)) return null;
  const out = [];
  for (const b of list) {
    if (!b || typeof b !== 'object') continue;
    const label = String(b.label || '方块').slice(0, 20);
    const color = /^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : '#111111';
    const direction = DIRECTIONS[b.direction] ? b.direction : 'right';
    out.push({ id: typeof b.id === 'string' && b.id ? b.id : uid(), label, color, direction });
  }
  return out.length ? out : null;
}

export function loadBlocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = sanitize(JSON.parse(raw));
      if (parsed) return parsed;
    }
  } catch (err) {
    // ignore corrupted storage and fall back to defaults
  }
  return DEFAULT_BLOCKS.map((b) => ({ ...b }));
}

export function saveBlocks(blocks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  } catch (err) {
    // storage may be unavailable; configuration simply won't persist
  }
}
