/**
 * Item Reordering & Position Helper:
 * Supports moving invoice items up and down cleanly with keyboard or touch controls.
 */
export function moveItemInArray(items, index, direction) {
  if (!Array.isArray(items)) return [];
  if (direction === 'up' && index <= 0) return items;
  if (direction === 'down' && index >= items.length - 1) return items;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  const copy = [...items];
  const [removed] = copy.splice(index, 1);
  copy.splice(targetIndex, 0, removed);
  return copy;
}
