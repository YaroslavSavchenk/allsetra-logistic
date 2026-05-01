# Logistiek Allsetra

Internal desktop web app for the logistics team. The app started as a focused
RouteConnect tracker workspace (Eco5, HCV5-Lite, Smart5) and is now a generic
logistics workspace that *also* handles other product lines — accessoires,
fietsbeveiliging, sensors, anything Allsetra ships. RouteConnect is just the
first product family with an IMEI flow; the architecture is product-pluggable
so adding a new line is a config change, not a rewrite.

The app has two main surfaces, switched via the top tab bar:

- **Orders** — both sales-originated orders pulled from Zoho CRM and
  ad-hoc orders that logistics creates themselves (for shipments without
  a sales quote — internal handovers, last-minute requests, accessoires-only
  drops, etc.). Logistics preps the order, scans IMEIs (only for products
  that have one), and marks it as shipped.
- **Voorraad** — inventory: per-product stock (`opVoorraad`) and open
  purchase orders (`opBestelling`), plus a full mutation audit trail. Stock
  moves automatically as orders are shipped and purchase orders are received;
  manual adjustments require a reason.

Sales-originated orders come from Zoho CRM. Logistics-originated orders
live in the local store (Zoho push is TBD). Today the order side runs on
mock or live Zoho depending on whether the binary was built with secrets;
the inventory side is mock-only. The product catalogue (used by the
order-creation picker) has both a mock path (local registry) and a live
Zoho path (Products module fetch).

## Tech stack

- **Desktop shell**: Tauri 2 (Rust + system WebView2 on Windows)
- **Auto-updater**: `tauri-plugin-updater` — pulls signed updates from GitHub
  Releases, verified against an Ed25519 pubkey baked in at build time
- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS
- **Data fetching**: TanStack Query (React Query)
- **State**: Local component state only — no Redux/Zustand
- **Backend**: the Tauri Rust side IS the backend (no separate server). For now
  it just hosts the window; when Zoho lands, it'll handle OAuth + API calls
  and own the secrets.

**Primary deliverable is a Windows `.msi` installer.** Linux/macOS builds are
incidental — Windows is the target. Final builds run on Windows (locally or
via the GitHub Actions workflow at `.github/workflows/release.yml`).

Keep dependencies minimal. Tailwind + React + an icon library is enough.

## Non-negotiable UX rules for the installed app

This is for internal logistics users, not developers. They download the
installer and must be productive in under 30 seconds.

- **No first-run configuration.** No settings screen, no API key prompts, no
  "paste your token" flows. The installer is shipped ready-to-run.
- **No `.env` or config files on the workstation.** `.env` is a dev-only
  concept; production config is either baked into the binary at build time,
  stored in the OS keyring, or shipped inside `tauri.conf.json` (for public
  values only).
- **Secrets are never visible as text.** No .env, no JSON config with API
  keys. Sensitive values either compile into the Rust binary (hard to
  extract) or live in Windows Credential Manager (user-profile-encrypted).
- **Auto-update is silent and opt-in-to-install.** Background check, small
  card in the corner when an update exists, user clicks to install. Never
  forced, never blocking.

If a feature requires the user to know a URL, paste a token, or edit a file,
redesign it before shipping.

## Language conventions

- **UI text (labels, messages, toasts, errors)**: Dutch
- **Code, identifiers, comments, commits**: English

## Data model

There are two independent domains:

### Orders (`src/types/order.ts`)

An `Order` has status, account, address, an `orderpick` list (what must be
shipped, read-only from sales), and a `units` list (one per piece of an
IMEI-bearing product). Both `OrderpickItem` and `Unit` reference products
by **`productId`**, never by free-text name or hardcoded device-type union.

Every order also carries a **`source: 'zoho' | 'logistics'`** field.
Sales-originated orders default to `'zoho'`; orders created by logistics
through the in-app form get `'logistics'`. The order shape is identical
either way — same status flow, same IMEI rules, same shipment-deduction.
The source field is the seam where Zoho-push behaviour for logistics-created
orders gets decided later (currently they stay local-only).

For logistics-originated orders the `account` field stores a free-text
recipient label (person, team, external company without a CRM record); for
sales-originated orders it's the linked CRM Account name. The UI label
adapts ("Ontvanger" vs "Account") but the field is the same.

Statuses: `Ter goedkeuring` | `Nieuw` | `In behandeling` | `Verstuurd`.
Logistics only sees `Nieuw` and `In behandeling`. `Ter goedkeuring` is
sales-only; `Verstuurd` is done.

### Products (`src/types/product.ts` + `src/lib/productStrategy.ts`)

`Product` carries `id`, `sku`, `name`, `category`, `hasIMEI`, `supplier`.
The `productStrategy` registry is the **single source of truth** for what
products exist and how they behave. It maps each product id to a Product
record and (for `hasIMEI: true` products) a list of IMEI prefixes used for
runtime detection. UI components never hardcode product names — they call
`getProduct(id)` / `getProductName(id)` against the registry.

Product categories today: `tracker` (RouteConnect Eco5/HCV5-Lite/Smart5),
`tracker-accessory` (ID Reader, Buzzer), `bike-security` (Fietsslot Pro,
Helm reflector), `sensor` (Temperatuur logger). Adding a new line means one
entry in the strategy registry — no domain-type changes.

Products without an IMEI appear in `orderpick` but do **not** generate Units.
Their stock is decremented purely by orderpick quantity on shipment.

### Inventory (`src/types/inventory.ts`)

`InventoryItem` has `opVoorraad` (physical stock), `opBestelling` (on open
purchase orders), and `lastMovementAt`. `totaalVerwacht = opVoorraad +
opBestelling` is computed in the UI, not stored.

Three event sources mutate stock — every mutation writes an
`InventoryMovement` audit row:

| Kind                | Trigger                                | Effect                                     |
|---------------------|----------------------------------------|--------------------------------------------|
| `purchase-received` | "Ontvangen" on an open `PurchaseOrder` | `opBestelling` ↓, `opVoorraad` ↑           |
| `shipment-deducted` | "Versturen" on a customer order        | `opVoorraad` ↓ per orderpick, signed delta |
| `manual-adjust`     | StockAdjustForm submit                 | `opVoorraad` ± delta, **reason mandatory** |

`PurchaseOrder` has `id`, `createdAt`, `note`, `status: 'open' | 'received'`,
`receivedAt?`, and `items: { productId, qty }[]`.

## Business rules

### IMEI → product detection

The `productStrategy` registry holds prefix lists per IMEI-bearing product.
`detectProductFromImei()` matches longest-prefix-first so `8637…` resolves
to Eco5 before the shorter `861…` rule fires. Today's prefixes:

| Prefix         | Product             |
|----------------|---------------------|
| `861…`, `8637…` | RouteConnect Eco5   |
| `8635…`         | RouteConnect HCV5-Lite |
| `864…`          | RouteConnect Smart5 |

To add a tracker line: register the product with `hasIMEI: true` and its
prefixes in `productStrategy.ts`. Nothing else changes.

### IMEI validation (all must hold)

1. Exactly 15 digits
2. Digits only — no spaces, dashes, letters
3. Prefix maps to a known IMEI product in the registry
4. Detected product matches the Unit's expected `productId`
5. Not duplicated within the same order

Validate **live as the user types** — no blur/submit gating. IMEI input is
only rendered for orders that have at least one Unit; non-IMEI orders
(accessoires-only, bike-security, sensors) skip the IMEI section entirely.

### Logistics-created orders (the "+ Nieuwe order" flow)

Logistics can create an order from the Orders sidebar via **+ Nieuwe order**.
The form asks for:

1. **Ontvanger** — required free-text label (name/team/company).
2. **Verzendadres** — required (address, postcode, city).
3. **Producten** — at least one line, each picked through the
   `<ProductPicker>` combobox (search by name or SKU). Quantity per line +
   optional regel-notitie.
4. **Interne notitie** — optional, attached as an `OrderNote` authored by
   "Logistiek".

`OrderService.createOrder(draft)` then:

- Generates an `LCO-NNNN` order number (logistics-created order; sequential
  per session in mock mode).
- Sets `source: 'logistics'`, `quoteOwner: 'Logistiek'`, `status: 'Nieuw'`.
- Auto-generates one `Unit` per piece of every `hasIMEI: true` product line.
  Non-IMEI lines stay in orderpick only.
- Returns the new `Order`; the UI immediately switches to the standard
  `OrderWorkspace` so the user can scan IMEIs (or ship right away if the
  order has no IMEI products).

The Zoho live-mode implementation of `createOrder` currently rejects with
a clear NL error — pushing logistics-created orders into Zoho is a
business-side decision that hasn't been made yet.

### Product catalogue

The Product type (`src/types/product.ts`) and the IMEI-prefix strategy
(`src/lib/productStrategy.ts`) describe **what** logistics can ship and
**how** it identifies it. There are two ways the catalogue surfaces in the
UI today:

- `getProduct(id)` / `getProductName(id)` — synchronous lookups from the
  local registry, used everywhere a product label needs rendering.
- `inventoryService.listProducts()` — async, returns the **full catalogue**.
  Used by the `<ProductPicker>` combobox in the new-order form. In mock
  mode this proxies the local registry; in Zoho mode it calls the
  `zoho_fetch_products` Rust command (Products module, ~200 records cached
  for 1h via TanStack Query).

The IMEI strategy (which products carry an IMEI, which prefixes belong to
each) is **always local** because Zoho doesn't know about it — it's
logistics-internal metadata. The Zoho catalog overlay computes `hasIMEI`
per product by looking up its **SKU** against the strategy registry
(`isImeiProductBySku`), so the bridge between Zoho ids and local IMEI
config is the SKU.

### Status transitions

- Starts `Nieuw`. Moves to `In behandeling` when logistics starts editing
  IMEIs (no IMEI → stays `Nieuw` until shipped).
- "Versturen" transitions to `Verstuurd`. For IMEI orders this only fires
  when every Unit has a valid IMEI. For non-IMEI orders it fires
  unconditionally.
- On successful ship: inventory is decremented for every orderpick line
  (`deductForShipment`), the order leaves the list, and the next open order
  is auto-selected.
- Negative stock after deduction is **allowed** — logistics gets a
  warning toast but the ship proceeds. They sometimes know more than the
  system (off-system count, last-minute restock).

## Architecture: Zoho-readiness

All persistence goes through service interfaces. There are two:

- **`OrderService`** — `getOpenOrders()`, `getOrderById(id)`,
  `updateOrderUnits(id, units)`, `markAsShipped(id)`,
  `createOrder(draft)` (logistics-created orders).
- **`InventoryService`** — `listInventory()`, `getProduct(productId)`,
  `listProducts()` (catalogue for the picker),
  `registerPurchaseOrder(items, note?)`, `receivePurchaseOrder(poId)`,
  `listPurchaseOrders()`, `adjustStock(productId, delta, reason)`,
  `deductForShipment(orderId, picks)`, `listMovements(productId?)`.

Today both have `Mock*Service` implementations seeded from the data files.
Later a `ZohoOrderService` (orders) and Zoho-Items / Inventory module-backed
implementation (inventory) plug in behind the same interfaces.
**Components must not reach into the mock arrays directly** — always go
through the service. **The product registry is read directly** from
`@/lib/productStrategy` — it's local-only metadata, not server state.

Mock data lives in exactly one file per domain: `src/data/mockData.ts` for
orders and `src/data/mockInventory.ts` for stock + purchase orders. The
product ids referenced in both files MUST exist in `productStrategy.ts` —
a single internal id space spans the whole app.

### Cross-tab consistency

Both tabs share the single `QueryClient` constructed in `main.tsx`. The
shipment flow in `useShipOrder` does three things in sequence:

1. `orderService.markAsShipped(id)`
2. `inventoryService.deductForShipment(orderId, picks)` (always — empty
   picks is a service-side no-op)
3. Re-fetches inventory and writes the fresh list back into the cache, then
   invalidates `OPEN_ORDERS_KEY` and `MOVEMENTS_KEY`

So the moment the user switches to the Voorraad tab after shipping, the
decremented stock and new mutation rows are already in the cache — no
manual refresh.

### Where secrets live

**Never in `.env` on a user's machine.** `.env` is a dev-only artifact. The
installed app must not ship any `.env` or config file with sensitive values —
they'd be readable inside the installer.

| Data                     | Dev (in repo)                       | Production (installed app)              |
|--------------------------|-------------------------------------|-----------------------------------------|
| `ZOHO_CLIENT_ID`         | `.env` (template `.env.example`)    | Compiled into binary via `env!(...)`     |
| `ZOHO_API_BASE`, module  | `.env`                              | Compiled into binary / `tauri.conf.json` |
| `ZOHO_CLIENT_SECRET`     | GitHub Secret + local `.env`        | Compiled into binary via build-time env  |
| `ZOHO_REFRESH_TOKEN`     | GitHub Secret (per-install, really) | **OS keyring** (Windows Credential Mgr)  |
| Access token             | —                                   | In-memory only, never persisted          |

**The pattern:** build-time secrets come from GitHub Secrets → env → Rust
`env!(...)` macro → compiled into the `.exe`. Runtime-obtained tokens (what
the user's OAuth flow returns on first auth) go to the OS keyring via the
`keyring` crate. Reverse-engineering a Rust binary to extract a string isn't
impossible but is orders of magnitude harder than reading a `.env` file, and
acceptable for internal-tool distribution.

Use the Rust side to read/write the keyring — candidates: the `keyring` crate
(thin wrapper over Win/Mac/Linux secret stores) or `tauri-plugin-stronghold`
(encrypted vault file with a password; cross-platform). Expose typed Tauri
commands (`#[tauri::command]`) so the frontend calls into Rust via
`@tauri-apps/api/core`.

### Service wiring

Zoho integration lives in `src-tauri/src/zoho/` with:
- `config.rs` — env-baked constants (secrets via `option_env!`) + field
  name mappings
- `client.rs` — HTTP + OAuth token cache + 401 retry
- `mapper.rs` — Zoho JSON → our `Order` (defensive; missing fields = empty
  string, never crashes the response)
- `commands.rs` — Tauri commands: `zoho_is_configured`,
  `zoho_fetch_open_orders`, `zoho_fetch_order` (joins notes in parallel),
  `zoho_fetch_products` (full Products module catalogue, filtered to active),
  `zoho_update_units`, `zoho_ship_order`

The TS `ZohoOrderService` is a thin invoker. `src/services/index.ts` is a
façade that probes `zoho_is_configured` once at load time and picks between
mock and live — so dev (`npm run dev` in browser) and Tauri-without-secrets
both work on mock, while CI builds with secrets baked in go live. The same
probe is reused to switch the **product catalogue** between the local
registry (mock) and `ZohoCatalogService` (live, calls `zoho_fetch_products`).

**Notes are a Zoho-native entity, not a custom field.** `zoho_fetch_order`
fetches `/{module}/{id}/Notes` in parallel with the order itself; the front
end polls this every 30s while an order is open so edits/additions in Zoho
show up without a manual refresh. The list view skips notes (N+1 avoidance).

### Zoho gotchas

- Zoho subformulier updates require sending **all rows** — missing rows get
  deleted by Zoho. Always round-trip the full `Units` array.
- Refresh token never expires unless revoked; access token is 1 hour.
- EU datacenter, sandbox URL `https://sandbox.zohoapis.eu`.
- Module API name `RouteConnectOrders_test` (confirm in Zoho setup).
- Products module API name defaults to `Products` (Zoho standard) — override
  via `ZOHO_PRODUCTS_MODULE` build-time env var if a custom module is used.
  Field defaults: `Product_Name`, `Product_Code`, `Product_Category`,
  `Vendor_Name`, `Product_Active`. Verify against the actual Zoho schema
  before going live.
- Logistics-created orders (`source: 'logistics'`) currently aren't pushed
  to Zoho — `ZohoOrderService.createOrder` rejects with a clear NL error.
  Decide with sales whether they should be pushed before enabling live mode
  for that flow.

Full Zoho reference (OAuth Self Client flow, endpoint list, required scopes)
is in the original project plan — reread it before integration.

## UI direction

Desktop-only. Functional and fast — logistics processes these in high tempo, so
minimize clicks and keep feedback immediate.

### Top-level layout

- **TopNav** (full-width, ~56px tall) with the brand and a tab bar. Tabs
  today: `Orders`, `Voorraad`. Component state in `App.tsx` switches the
  body — no router. Adding a tab is one entry in the `TABS` array plus a
  `<NewTab />` mount.
- Tabs are generic: `TopNav` is parameterised on a `TabDefinition<Id>` array,
  so adding a third or fourth tab does not require any structural change.

### Orders tab

- Sidebar (left, ~320px) with open-order list + search
- Workspace (right) with order details
- Sales note: if present, shown prominently as an amber warning block — must
  not be missed
- Units table: one row per unit, product label resolved from the registry
  (read-only), IMEI input (monospace), live validation indicator
- Units section is **hidden entirely** for orders without IMEI products
- Ship button: large, bottom of the workspace, disabled until every IMEI is
  valid (or always enabled for non-IMEI orders). Progress text like
  "3/5 units klaar" / "Geen IMEI-producten in deze order — klaar om te versturen"

### Voorraad tab

- Product list (left, ~384px): every product known to the registry, with
  Op voorraad / Op bestelling / Totaal verwacht columns. Search by name or
  SKU. Stock ≤ 5 is rendered in rose to flag low-stock at a glance.
- Detail workspace (right): selected product header (name, SKU, category,
  supplier, latest movement) + four stacked sections:
  1. **Voorraad aanpassen** — signed delta + mandatory reason
  2. **Openstaande inkooporders** — filtered to this product, "Ontvangen" per row
  3. **Inkooporder registreren** — single-product form (qty + optional note)
  4. **Mutaties** — newest-first audit trail with signed colored deltas

### Cross-cutting

- **Barcode scanner support**: IMEI inputs must handle scanner input
  (types + Enter). On Enter, move focus to the next IMEI field
- **Keyboard-first**: Tab between fields, Enter to advance — no mouse
  required for the core task
- **Feedback**: toast notifications via `sonner` only — never modals
- **Negative-stock toast**: when a ship pushes any picked product below
  zero, surface a warning toast but never block the ship

No mobile. No playful aesthetic — this is a workstation.

## Project layout

```
src/                          Frontend (React + TS)
  types/
    order.ts                  Order, Unit, OrderpickItem, OrderStatus, OrderNote
    product.ts                Product, ProductCategory
    inventory.ts              InventoryItem, InventoryMovement, PurchaseOrder
  data/
    mockData.ts               Realistic sample orders (single replacement point)
    mockInventory.ts          Inventory seed + open purchase orders
  lib/
    productStrategy.ts        Product registry + IMEI prefix index (pluggable)
    imei.ts                   IMEI validation; talks to productStrategy
    format.ts                 Date/time formatter (nl-NL)
  services/
    orderService.ts           Interface (incl. createOrder + OrderDraft)
    mockOrderService.ts       In-memory impl (LCO numbering, auto-generates
                              Units for IMEI products on createOrder)
    zohoOrderService.ts       Tauri-invoke shim (live mode); createOrder
                              rejects pending business decision
    inventoryService.ts       Interface (incl. listProducts catalogue)
    mockInventoryService.ts   In-memory impl
    zohoCatalogService.ts     Live product catalogue (Zoho Products module)
    index.ts                  Façade — picks mock vs. live per service
  hooks/
    useOrders.ts              React Query hooks (useShipOrder composes
                              inventory deduction; useCreateOrder for the
                              new-order flow)
    useInventory.ts           Inventory + catalogue hooks; exports query keys
    useAppUpdate.ts           Auto-update prompt
  components/
    TopNav.tsx                Generic tab bar
    ProductPicker.tsx         Searchable single-select combobox over the
                              catalogue (used in NewOrderForm)
    UpdatePrompt.tsx
    orders/                   Orders-tab UI (Sidebar, OrderWorkspace,
                              UnitsTable, OrderpickList, NotesPanel,
                              StatusBadge, EmptyState, NewOrderForm,
                              OrdersTab)
    inventory/                Voorraad-tab UI (InventoryTab, InventoryTable,
                              InventoryDetail, StockAdjustForm,
                              PurchaseOrderForm, OpenPurchaseOrders,
                              MovementsList)
  App.tsx                     Top-level tab switch
  main.tsx                    Single QueryClient

src-tauri/                    Desktop shell (Rust)
  Cargo.toml
  tauri.conf.json              Window, CSP, bundle targets
  src/main.rs, src/lib.rs     Tauri builder, plugins, future Zoho commands
  src/zoho/                    Order-side Zoho client (Rust). Inventory-side
                                module is not yet implemented — the JS façade
                                in services/index.ts always picks the mock
                                inventory service.
  capabilities/default.json   Permission ACL
  icons/                       Generated by tauri init

.github/workflows/release.yml CI — builds Windows installer on tag push
```

Mock data: orders live in `src/data/mockData.ts`, inventory + purchase
orders in `src/data/mockInventory.ts`. Both files reference products by id
from `src/lib/productStrategy.ts` — that's the only place where product
metadata is defined. Adding a product is one entry in the strategy registry;
adding mock stock for it is one entry in `mockInventory.ts`.

## Out of scope (this version)

Real Zoho API, auth for logistics users, mobile views, sales approval flow,
dashboards, archive, admin panel, Docker/deploy config, automated tests.
