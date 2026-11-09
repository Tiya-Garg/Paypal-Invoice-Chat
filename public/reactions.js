/**
 * Message Reactions Controller:
 * Handles emoji reactions (👍, ❤️, 🚀, 💰) on chat bubbles with live counter updates.
 */
export interface ReactionData {
  emoji: string;
  count: number;
  users: string[];
}

export class MessageReactionController {
  static renderReactions(
    reactions: ReactionData[],
    currentRole: string,
    onToggle: (emoji: string) => void,
  ): HTMLElement {
    const container = document.createElement('div');
    container.className = 'msg-reactions-bar';

    reactions.forEach(r => {
      const btn = document.createElement('button');
      const hasReacted = r.users.includes(currentRole);
      btn.className = `reaction-pill ${hasReacted ? 'has-reacted' : ''}`;
      btn.innerHTML = `<span class="reaction-emoji">${r.emoji}</span> <span class="reaction-count">${r.count}</span>`;
      btn.onclick = () => onToggle(r.emoji);
      container.appendChild(btn);
    });

    return container;
  }
}
