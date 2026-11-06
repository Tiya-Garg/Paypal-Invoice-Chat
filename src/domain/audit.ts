import type { Invoice } from '../domain/types.js';

export interface AuditRecord {
  id: string;
  invoiceId: string;
  actor: string;
  action: 'create' | 'update' | 'send' | 'cancel' | 'pay';
  details: Record<string, unknown>;
  timestamp: string;
}

export class AuditLog {
  private records: AuditRecord[] = [];

  public log(invoiceId: string, actor: string, action: AuditRecord['action'], details: Record<string, unknown> = {}) {
    const entry: AuditRecord = {
      id: Math.random().toString(36).slice(2, 9),
      invoiceId,
      actor,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    this.records.push(entry);
    return entry;
  }

  public getByInvoice(invoiceId: string): AuditRecord[] {
    return this.records.filter(r => r.invoiceId === invoiceId);
  }
}

export const defaultAuditLog = new AuditLog();

