/**
 * Optimistic Message Tracker:
 * Adds temporary client-generated IDs with pending/sent/delivered status markers.
 */
export interface OptimisticMessage {
  tempId: string;
  authorRole: 'seller' | 'firm';
  body: string;
  createdAt: string;
  status: 'pending' | 'sent' | 'failed';
}

export class OptimisticMessageTracker {
  private static pendingMap: Map<string, OptimisticMessage> = new Map();

  static create(body: string, authorRole: 'seller' | 'firm'): OptimisticMessage {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const msg: OptimisticMessage = {
      tempId,
      authorRole,
      body,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    this.pendingMap.set(tempId, msg);
    return msg;
  }

  static markSent(tempId: string) {
    const msg = this.pendingMap.get(tempId);
    if (msg) {
      msg.status = 'sent';
    }
  }

  static markFailed(tempId: string) {
    const msg = this.pendingMap.get(tempId);
    if (msg) {
      msg.status = 'failed';
    }
  }

  static remove(tempId: string) {
    this.pendingMap.delete(tempId);
  }

  static getPending(): OptimisticMessage[] {
    return Array.from(this.pendingMap.values());
  }
}
