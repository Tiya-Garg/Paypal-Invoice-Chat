/**
 * Typing Indicator Manager:
 * Broadcasts typing activity and animates presence indicators in real-time chat.
 */
export class TypingIndicator {
  private static timeouts: Map<string, NodeJS.Timeout | number> = new Map();
  private static isCurrentlyTyping = false;
  private static stopTimer: NodeJS.Timeout | number | null = null;

  /**
   * Tracks local keypresses and broadcasts typing state over websocket.
   */
  static handleLocalInput(sendWs: (msg: unknown) => void) {
    if (!this.isCurrentlyTyping) {
      this.isCurrentlyTyping = true;
      sendWs({ type: 'typing', isTyping: true });
    }

    if (this.stopTimer) {
      clearTimeout(this.stopTimer as number);
    }

    this.stopTimer = setTimeout(() => {
      this.isCurrentlyTyping = false;
      sendWs({ type: 'typing', isTyping: false });
    }, 1500);
  }

  /**
   * Handles incoming typing event from peer.
   */
  static setPeerTyping(role: string, isTyping: boolean, containerEl: HTMLElement) {
    let indicator = containerEl.querySelector(`.typing-indicator[data-role="${role}"]`) as HTMLElement;

    if (!isTyping) {
      if (indicator) indicator.remove();
      const existing = this.timeouts.get(role);
      if (existing) clearTimeout(existing as number);
      this.timeouts.delete(role);
      return;
    }

    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'typing-indicator';
      indicator.setAttribute('data-role', role);
      indicator.innerHTML = `
        <span class="typing-role">${role === 'seller' ? 'Seller' : 'Buyer'} is typing</span>
        <span class="typing-dots">
          <span></span><span></span><span></span>
        </span>
      `;
      containerEl.appendChild(indicator);
    }

    // Auto-remove after 3 seconds if no heartbeat received
    const existing = this.timeouts.get(role);
    if (existing) clearTimeout(existing as number);

    const timer = setTimeout(() => {
      indicator?.remove();
      this.timeouts.delete(role);
    }, 3000);

    this.timeouts.set(role, timer);
  }
}
