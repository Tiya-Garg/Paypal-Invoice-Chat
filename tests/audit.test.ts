import { describe, it, expect } from 'vitest';
import { AuditLog } from '../src/domain/audit.js';

describe('Invoice Audit Logging', () => {
  it('records and retrieves invoice mutation history', () => {
    const audit = new AuditLog();
    audit.log('inv-100', 'seller@test.com', 'create', { version: 1 });
    audit.log('inv-100', 'seller@test.com', 'update', { version: 2, itemAdded: 'Material A' });
    audit.log('inv-200', 'seller@test.com', 'create', { version: 1 });

    const inv100History = audit.getByInvoice('inv-100');
    expect(inv100History.length).toBe(2);
    expect(inv100History[0]?.action).toBe('create');
    expect(inv100History[1]?.action).toBe('update');

    const inv200History = audit.getByInvoice('inv-200');
    expect(inv200History.length).toBe(1);
  });
});

