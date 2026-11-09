/**
 * Connection Status Pill & Latency Meter:
 * Displays connection state ('connected' | 'connecting' | 'offline') and measured round-trip ping.
 */
export class ConnectionStatusPill {
  private static pillEl: HTMLElement | null = null;
  private static pingInterval: NodeJS.Timeout | number | null = null;
  private static lastPingTime = 0;

  static init(containerEl: HTMLElement, sendPing: () => void): HTMLElement {
    this.pillEl = document.createElement('div');
    this.pillEl.className = 'connection-status-pill status-connecting';
    this.pillEl.innerHTML = `
      <span class="status-indicator-dot"></span>
      <span class="status-label">Connecting</span>
      <span class="status-ping"></span>
    `;

    containerEl.appendChild(this.pillEl);

    // Periodic ping every 10 seconds
    this.pingInterval = setInterval(() => {
      this.lastPingTime = performance.now();
      sendPing();
    }, 10000);

    return this.pillEl;
  }

  static setConnected() {
    if (!this.pillEl) return;
    this.pillEl.className = 'connection-status-pill status-connected';
    this.pillEl.querySelector('.status-label')!.textContent = 'Live';
  }

  static setDisconnected() {
    if (!this.pillEl) return;
    this.pillEl.className = 'connection-status-pill status-offline';
    this.pillEl.querySelector('.status-label')!.textContent = 'Offline';
    this.pillEl.querySelector('.status-ping')!.textContent = '';
  }

  static handlePong() {
    if (!this.pillEl || !this.lastPingTime) return;
    const latency = Math.round(performance.now() - this.lastPingTime);
    this.pillEl.querySelector('.status-ping')!.textContent = `${latency}ms`;
  }
}
