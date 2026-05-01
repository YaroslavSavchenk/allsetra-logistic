/**
 * Inventory domain types.
 *
 * The inventory module tracks physical stock for every product known to the
 * product strategy registry. There is one `InventoryItem` per product. The
 * service computes nothing — derived values like "totaal verwacht" are kept
 * in the UI so persistence stays close to the underlying numbers.
 *
 * Three event sources mutate stock:
 *  - `purchase-received` : an open `PurchaseOrder` was received; quantities
 *                          move from `opBestelling` to `opVoorraad`.
 *  - `shipment-deducted` : a customer order was shipped; `opVoorraad` is
 *                          decremented per pick. `linkedOrderId` is set.
 *  - `manual-adjust`     : logistics corrects stock by hand (count, damage,
 *                          loss). The `reason` field is mandatory.
 */

export interface InventoryItem {
  productId: string;
  /** Physical stock on hand right now. May go negative on shipment if stock is short. */
  opVoorraad: number;
  /** Quantity sitting on open purchase orders that have not been received yet. */
  opBestelling: number;
  /** ISO timestamp of the most recent movement, or null if there has never been one. */
  lastMovementAt: string | null;
}

export type InventoryMovementKind =
  | 'purchase-received'
  | 'shipment-deducted'
  | 'manual-adjust';

export interface InventoryMovement {
  id: string;
  productId: string;
  /** Signed delta applied to `opVoorraad`. Positive on receipt, negative on shipment. */
  delta: number;
  reason: string;
  createdAt: string;
  kind: InventoryMovementKind;
  /** Set when `kind === 'shipment-deducted'`. References the customer order. */
  linkedOrderId?: string;
}

export type PurchaseOrderStatus = 'open' | 'received';

export interface PurchaseOrderLine {
  productId: string;
  qty: number;
  /**
   * Set when this specific line is received. A multi-product PO may arrive
   * piecemeal; the user clicks "Ontvangen" per product line and stock for
   * only that product moves. The parent PO becomes `'received'` once every
   * line is received.
   */
  receivedAt?: string;
}

export interface PurchaseOrder {
  id: string;
  createdAt: string;
  note: string;
  status: PurchaseOrderStatus;
  /** Set when every line is received. */
  receivedAt?: string;
  items: PurchaseOrderLine[];
}
