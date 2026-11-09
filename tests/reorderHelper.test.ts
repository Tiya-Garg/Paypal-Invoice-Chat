import { describe, it, expect } from 'vitest';
import { moveItemInArray } from '../public/reorderHelper.js';

describe('moveItemInArray helper', () => {
  it('moves an item upwards correctly', () => {
    const list = ['A', 'B', 'C'];
    const moved = moveItemInArray(list, 1, 'up');
    expect(moved).toEqual(['B', 'A', 'C']);
  });

  it('moves an item downwards correctly', () => {
    const list = ['A', 'B', 'C'];
    const moved = moveItemInArray(list, 1, 'down');
    expect(moved).toEqual(['A', 'C', 'B']);
  });

  it('does not mutate original array and bounds checks correctly', () => {
    const list = ['A', 'B'];
    const movedTop = moveItemInArray(list, 0, 'up');
    expect(movedTop).toEqual(['A', 'B']);

    const movedBottom = moveItemInArray(list, 1, 'down');
    expect(movedBottom).toEqual(['A', 'B']);
  });
});
