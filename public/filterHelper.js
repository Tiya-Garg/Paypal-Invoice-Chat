/**
 * Interactive Client-Side Search / Filter Controller:
 * Live filters messages or line items as user queries keywords.
 */
export function filterItemsByQuery<T extends { description: string }>(
  items: T[],
  query: string,
): T[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return items;
  return items.filter(item => item.description.toLowerCase().includes(clean));
}
