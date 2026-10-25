import { redBlock, blueBlock } from './blocks/red.js';

const blocks = [redBlock, blueBlock];

export function getDefaultBlocks() {
  return blocks;
}

export function getBlockById(id) {
  return blocks.find((block) => block.id === id) || null;
}
