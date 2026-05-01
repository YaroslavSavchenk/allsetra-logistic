/**
 * A Product is anything logistics can ship - trackers, accessories, and
 * non-RouteConnect product lines alike. The product master is the single
 * point of truth for what's shippable; orders, units and inventory all
 * reference products by id.
 *
 * `hasIMEI` is the high-level switch: products with an IMEI go through the
 * scan-and-validate flow and have one Unit per piece in an order. Products
 * without an IMEI appear in `orderpick` only and are deducted from stock by
 * quantity on shipment.
 *
 * Detection rules (which IMEI prefix maps to which product) live in the
 * product strategy registry, not in this type.
 */
export type ProductCategory =
  | 'tracker'
  | 'tracker-accessory'
  | 'bike-security'
  | 'sensor';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  hasIMEI: boolean;
  supplier: string;
}
