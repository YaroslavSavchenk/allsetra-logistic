import type { Product, ProductCategory } from '@/types/product';

/**
 * The product strategy registry is the single source of truth for what
 * products exist and how they behave. Today it's a static list - the Zoho
 * Products module will replace this seed with a fetched + cached list, but
 * the rest of the app keeps talking through the same lookup helpers.
 *
 * Per-product flow:
 *  - `hasIMEI: true`  → IMEI scan flow, one Unit per piece, prefix-based
 *                        type detection.
 *  - `hasIMEI: false` → orderpick line only, no IMEI input, deducted by
 *                        quantity on ship.
 *
 * IMEI prefix matching uses longest-prefix wins so '8637…' resolves to Eco5
 * before the shorter '861…' rule fires.
 */

interface ProductDefinition {
  product: Product;
  imeiPrefixes?: string[];
}

const DEFINITIONS: ProductDefinition[] = [
  // --- RouteConnect tracker line (IMEI required) ----------------------
  {
    product: {
      id: 'rc-eco5',
      sku: 'RC-ECO5',
      name: 'RouteConnect Eco5',
      category: 'tracker',
      hasIMEI: true,
      supplier: 'RouteConnect',
    },
    imeiPrefixes: ['8637', '861'],
  },
  {
    product: {
      id: 'rc-hcv5-lite',
      sku: 'RC-HCV5L',
      name: 'RouteConnect HCV5-Lite',
      category: 'tracker',
      hasIMEI: true,
      supplier: 'RouteConnect',
    },
    imeiPrefixes: ['8635'],
  },
  {
    product: {
      id: 'rc-smart5',
      sku: 'RC-SMART5',
      name: 'RouteConnect Smart5',
      category: 'tracker',
      hasIMEI: true,
      supplier: 'RouteConnect',
    },
    imeiPrefixes: ['864'],
  },

  // --- RouteConnect accessories (no IMEI) -----------------------------
  {
    product: {
      id: 'acc-id-reader',
      sku: 'ACC-IDR',
      name: 'ID Reader',
      category: 'tracker-accessory',
      hasIMEI: false,
      supplier: 'RouteConnect',
    },
  },
  {
    product: {
      id: 'acc-buzzer',
      sku: 'ACC-BUZ',
      name: 'Buzzer',
      category: 'tracker-accessory',
      hasIMEI: false,
      supplier: 'RouteConnect',
    },
  },
  {
    product: {
      id: 'acc-power-cable',
      sku: 'ACC-PWR-12-24',
      name: 'Voedingskabel 12V/24V (3m)',
      category: 'tracker-accessory',
      hasIMEI: false,
      supplier: 'RouteConnect',
    },
  },
  {
    product: {
      id: 'acc-antenna-ext',
      sku: 'ACC-ANT-EXT',
      name: 'Externe GPS-antenne (5m)',
      category: 'tracker-accessory',
      hasIMEI: false,
      supplier: 'RouteConnect',
    },
  },
  {
    product: {
      id: 'acc-mount-bracket',
      sku: 'ACC-BRK-UNI',
      name: 'Montageset universeel',
      category: 'tracker-accessory',
      hasIMEI: false,
      supplier: 'RouteConnect',
    },
  },
  {
    product: {
      id: 'acc-obd-adapter',
      sku: 'ACC-OBD2',
      name: 'OBD-II adapter',
      category: 'tracker-accessory',
      hasIMEI: false,
      supplier: 'RouteConnect',
    },
  },
  {
    product: {
      id: 'acc-harness-y',
      sku: 'ACC-HRN-Y',
      name: 'Y-kabelboom',
      category: 'tracker-accessory',
      hasIMEI: false,
      supplier: 'RouteConnect',
    },
  },
  {
    product: {
      id: 'acc-panic-button',
      sku: 'ACC-PNC',
      name: 'Paniekknop (bedraad)',
      category: 'tracker-accessory',
      hasIMEI: false,
      supplier: 'RouteConnect',
    },
  },
  {
    product: {
      id: 'acc-relay',
      sku: 'ACC-REL-IMM',
      name: 'Immobilizer-relais',
      category: 'tracker-accessory',
      hasIMEI: false,
      supplier: 'RouteConnect',
    },
  },

  // --- Bike security family (no IMEI, demonstrates the generalisation) -
  {
    product: {
      id: 'bs-bike-lock-pro',
      sku: 'BS-LOCK-P',
      name: 'Fietsslot Pro',
      category: 'bike-security',
      hasIMEI: false,
      supplier: 'BikeSec NL',
    },
  },
  {
    product: {
      id: 'bs-helmet-reflector',
      sku: 'BS-REFL',
      name: 'Helm reflector',
      category: 'bike-security',
      hasIMEI: false,
      supplier: 'BikeSec NL',
    },
  },
  {
    product: {
      id: 'bs-spoke-lock',
      sku: 'BS-SPK',
      name: 'Spaakslot AXA',
      category: 'bike-security',
      hasIMEI: false,
      supplier: 'BikeSec NL',
    },
  },
  {
    product: {
      id: 'bs-alarm',
      sku: 'BS-ALM',
      name: 'Anti-diefstal alarm',
      category: 'bike-security',
      hasIMEI: false,
      supplier: 'BikeSec NL',
    },
  },
  {
    product: {
      id: 'bs-chain-lock',
      sku: 'BS-CHN',
      name: 'Kettingslot 120cm',
      category: 'bike-security',
      hasIMEI: false,
      supplier: 'BikeSec NL',
    },
  },

  // --- Sensors (no IMEI) ----------------------------------------------
  {
    product: {
      id: 'sn-temp-logger',
      sku: 'SN-TEMP',
      name: 'Temperatuur logger',
      category: 'sensor',
      hasIMEI: false,
      supplier: 'Sensorik',
    },
  },
  {
    product: {
      id: 'sn-door-contact',
      sku: 'SN-DOOR',
      name: 'Deurcontact-sensor',
      category: 'sensor',
      hasIMEI: false,
      supplier: 'Sensorik',
    },
  },
  {
    product: {
      id: 'sn-motion',
      sku: 'SN-PIR',
      name: 'Bewegingssensor (PIR)',
      category: 'sensor',
      hasIMEI: false,
      supplier: 'Sensorik',
    },
  },
  {
    product: {
      id: 'sn-fuel-level',
      sku: 'SN-FUEL',
      name: 'Brandstof-niveausensor',
      category: 'sensor',
      hasIMEI: false,
      supplier: 'Sensorik',
    },
  },
  {
    product: {
      id: 'sn-humidity',
      sku: 'SN-HUM',
      name: 'Luchtvochtigheidssensor',
      category: 'sensor',
      hasIMEI: false,
      supplier: 'Sensorik',
    },
  },
  {
    product: {
      id: 'sn-tire-pressure',
      sku: 'SN-TPMS',
      name: 'Bandenspanning-sensor (TPMS)',
      category: 'sensor',
      hasIMEI: false,
      supplier: 'Sensorik',
    },
  },
];

const BY_ID: Map<string, ProductDefinition> = new Map(
  DEFINITIONS.map((d) => [d.product.id, d]),
);

const BY_SKU: Map<string, ProductDefinition> = new Map(
  DEFINITIONS.map((d) => [d.product.sku, d]),
);

const KNOWN_CATEGORIES: ReadonlySet<string> = new Set<ProductCategory>([
  'tracker',
  'tracker-accessory',
  'bike-security',
  'sensor',
]);

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  tracker: 'Tracker',
  'tracker-accessory': 'Accessoire',
  'bike-security': 'Fietsbeveiliging',
  sensor: 'Sensor',
};

const PREFIX_INDEX: Array<{ prefix: string; productId: string }> = (() => {
  const idx: Array<{ prefix: string; productId: string }> = [];
  for (const def of DEFINITIONS) {
    if (def.imeiPrefixes) {
      for (const p of def.imeiPrefixes) {
        idx.push({ prefix: p, productId: def.product.id });
      }
    }
  }
  // Longest first so '8637' wins over '861'.
  idx.sort((a, b) => b.prefix.length - a.prefix.length);
  return idx;
})();

export function getProduct(id: string): Product | null {
  return BY_ID.get(id)?.product ?? null;
}

export function getProductName(id: string): string {
  return BY_ID.get(id)?.product.name ?? id;
}

export function listProducts(): Product[] {
  return DEFINITIONS.map((d) => d.product);
}

export function listProductsByCategory(category: ProductCategory): Product[] {
  return DEFINITIONS.filter((d) => d.product.category === category).map(
    (d) => d.product,
  );
}

export function isImeiProduct(id: string): boolean {
  return BY_ID.get(id)?.product.hasIMEI ?? false;
}

/**
 * Same as `isImeiProduct` but keyed by SKU instead of internal id. Used by
 * the Zoho catalog overlay: Zoho returns its own record ids, but SKUs are
 * stable across the local registry and Zoho.
 */
export function isImeiProductBySku(sku: string): boolean {
  return BY_SKU.get(sku)?.product.hasIMEI ?? false;
}

/**
 * Coerce a free-text category string (e.g. from a Zoho picklist) into our
 * typed `ProductCategory` union. Unknown values fall back to
 * `'tracker-accessory'` so the UI always renders a recognisable label.
 */
export function normaliseCategory(raw: string): ProductCategory {
  return KNOWN_CATEGORIES.has(raw)
    ? (raw as ProductCategory)
    : 'tracker-accessory';
}

/**
 * Resolve a raw IMEI to the product id whose prefix it matches. Returns
 * `null` for non-numeric strings or unknown prefixes. Does not check IMEI
 * length - call sites that need the full validation use `validateImei`.
 */
export function detectProductFromImei(imei: string): string | null {
  if (!/^\d+$/.test(imei)) return null;
  for (const { prefix, productId } of PREFIX_INDEX) {
    if (imei.startsWith(prefix)) return productId;
  }
  return null;
}
