import { invoke } from '@tauri-apps/api/core';
import type { Product, ProductCategory } from '@/types/product';
import {
  isImeiProductBySku,
  normaliseCategory,
} from '@/lib/productStrategy';

/**
 * Live product catalogue fetched from the Zoho Products module via the Rust
 * `zoho_fetch_products` command. Zoho doesn't know which products carry an
 * IMEI — that's logistics-internal metadata — so we overlay `hasIMEI` from
 * the local SKU-keyed strategy registry after the fetch.
 *
 * Same pattern as `zohoOrderService`: secrets stay in the Rust binary, the
 * frontend just invokes.
 */
export const zohoCatalogService = {
  async listProducts(): Promise<Product[]> {
    const products = await invoke<Product[]>('zoho_fetch_products');
    return products.map((p) => ({
      ...p,
      // Re-categorise into our typed union; Zoho's free-text picklist may
      // not match exactly. Falls back to `tracker-accessory` for unknowns.
      category: normaliseCategory(p.category) as ProductCategory,
      // Local SKU-keyed strategy decides whether this product needs an IMEI.
      hasIMEI: isImeiProductBySku(p.sku),
    }));
  },
};
