/**
 * Skeleton Loader Generator:
 * Creates animated shimmer skeleton placeholders while initial invoice state loads over WebSocket.
 */
export function createInvoiceSkeleton(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'skeleton-wrapper';
  wrapper.innerHTML = `
    <div class="skeleton-shimmer skeleton-title"></div>
    <div class="skeleton-shimmer skeleton-banner"></div>
    <div class="skeleton-table">
      <div class="skeleton-shimmer skeleton-row"></div>
      <div class="skeleton-shimmer skeleton-row"></div>
      <div class="skeleton-shimmer skeleton-row"></div>
    </div>
    <div class="skeleton-shimmer skeleton-total"></div>
  `;
  return wrapper;
}
