import type { Invoice } from '../domain/types.js';

export interface InvoiceDiff {
  versionFrom: number;
  versionTo: number;
  addedItems: string[];
  removedItems: string[];
  modifiedItems: Array<{ id: string; from: string; to: string }>;
  taxChanged: boolean;
  discountChanged: boolean;
}

export function computeInvoiceDiff(vFrom: Invoice, vTo: Invoice): InvoiceDiff {
  const mapFrom = new Map(vFrom.items.map(i => [i.id, i]));
  const mapTo = new Map(vTo.items.map(i => [i.id, i]));

  const addedItems: string[] = [];
  const removedItems: string[] = [];
  const modifiedItems: Array<{ id: string; from: string; to: string }> = [];

  for (const [id, item] of mapTo.entries()) {
    if (!mapFrom.has(id)) {
      addedItems.push(item.description);
    } else {
      const oldItem = mapFrom.get(id)!;
      if (oldItem.description !== item.description || oldItem.unitMinor !== item.unitMinor || oldItem.qtyMilli !== item.qtyMilli) {
        modifiedItems.push({
          id,
          from: `${oldItem.description} (${Number(oldItem.unitMinor) / 100})`,
          to: `${item.description} (${Number(item.unitMinor) / 100})`,
        });
      }
    }
  }

  for (const [id, item] of mapFrom.entries()) {
    if (!mapTo.has(id)) {
      removedItems.push(item.description);
    }
  }

  const taxChanged = JSON.stringify(vFrom.tax) !== JSON.stringify(vTo.tax);
  const discountChanged = JSON.stringify(vFrom.discount) !== JSON.stringify(vTo.discount);

  return {
    versionFrom: vFrom.version,
    versionTo: vTo.version,
    addedItems,
    removedItems,
    modifiedItems,
    taxChanged,
    discountChanged,
  };
}
