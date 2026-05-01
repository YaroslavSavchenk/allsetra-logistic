import type { Product } from '@/types/product';
import type {
  InventoryItem,
  InventoryMovement,
  PurchaseOrder,
} from '@/types/inventory';

/**
 * Interface that abstracts inventory persistence. Components depend on this,
 * not on a specific implementation. `MockInventoryService` is used today; a
 * Zoho-backed implementation will slot in behind the same interface later.
 */
export interface InventoryService {
  listInventory(): Promise<InventoryItem[]>;
  getProduct(productId: string): Promise<Product | null>;

  /**
   * Full product catalogue. Used by the order-creation product picker. The
   * mock backend reads from `productStrategy.ts`; the live backend pulls
   * from the Zoho Products module via the Rust `zoho_fetch_products`
   * command and overlays local IMEI metadata.
   */
  listProducts(): Promise<Product[]>;

  // TODO: replace with Zoho Purchase Orders module when CRM integration goes live
  registerPurchaseOrder(
    items: { productId: string; qty: number }[],
    note?: string,
  ): Promise<PurchaseOrder>;

  /**
   * Receive a single product line on an open PO. Multi-product POs often
   * arrive in chunks; this lets the user mark each line individually so
   * stock for unrelated products on the same PO doesn't move yet. The PO
   * itself flips to `'received'` only when every line is received.
   */
  receivePurchaseOrder(poId: string, productId: string): Promise<PurchaseOrder>;
  listPurchaseOrders(): Promise<PurchaseOrder[]>;

  /**
   * Verwijder een open inkooporder. Alleen toegestaan voor PO's met
   * status `'open'` — een ontvangen PO heeft al voorraad bewegingen
   * gegenereerd en blijft als audit-spoor staan.
   */
  deletePurchaseOrder(poId: string): Promise<void>;

  adjustStock(
    productId: string,
    delta: number,
    reason: string,
  ): Promise<InventoryMovement>;

  deductForShipment(
    orderId: string,
    picks: { productId: string; qty: number }[],
  ): Promise<InventoryMovement[]>;

  listMovements(productId?: string): Promise<InventoryMovement[]>;
}
