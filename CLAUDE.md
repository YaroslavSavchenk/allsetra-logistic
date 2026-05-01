# Logistiek Allsetra

Internal desktop web app for the logistics team. The app started as a focused
RouteConnect tracker workspace (Eco5, HCV5-Lite, Smart5) and is now a generic
logistics workspace that *also* handles other product lines — accessoires,
fietsbeveiliging, sensors, anything Allsetra ships. RouteConnect is just the
first product family with an IMEI flow; the architecture is product-pluggable
so adding a new line is a config change, not a rewrite.

The app has four surfaces, switched via the top tab bar:

- **Orders** — both sales-originated orders pulled from Zoho CRM and
  ad-hoc orders that logistics creates themselves (for shipments without
  a sales quote — internal handovers, last-minute requests, accessoires-only
  drops, etc.). Logistics preps the order, scans IMEIs (only for products
  that have one), and marks it as shipped.
- **Verzonden** — read-only feed of orders with status `Verstuurd`, sorted
  most-recent first. Each shipped order surfaces a **pakbon** (waybill) PDF
  that can be opened, printed, or downloaded. The pakbon is the same
  reusable template used by the toast-action that fires right after
  shipping, so logistics can print before moving on to the next order.
- **Voorraad** — inventory: per-product stock (`opVoorraad`) and open
  purchase orders (`opBestelling`), plus a full mutation audit trail. Stock
  moves automatically as orders are shipped and purchase orders are received;
  manual adjustments require a reason.
- **Instellingen** — preferences (theme), the active profile, an accounts
  list (beheer-only), and read-only app/version info. No API keys, no
  first-run wizards — the rule from "Non-negotiable UX" still holds for
  secrets; this tab is **only** for preferences and identity.

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
- **Pakbon**: pure HTML in an iframe + the system print dialog
  (`iframe.contentWindow.print()`). No PDF library — the WebView2 print
  pipeline already produces high-quality output, and "Microsoft Print to
  PDF" is a default Windows printer so save-as-PDF is one click for the
  user. We tried `@react-pdf/renderer` first (v0.3.0) but its `<PDFViewer>`
  renders the doc through a `blob:` iframe URL that the Tauri CSP blocks,
  so the modal showed up empty. The HTML approach has zero CSP gotchas and
  is much smaller in the bundle.
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

`shippedAt: string | null` is set by `markAsShipped` when an order
transitions to `Verstuurd` and stays `null` for everything that hasn't
shipped. Drives the Verzonden-tab sort (newest first) and the pakbon
header. The pakbon template treats a `null` shippedAt defensively (renders
"—") so it doesn't crash on partially-migrated data.

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
- "Versturen" transitions to `Verstuurd` and stamps `shippedAt`. For IMEI
  orders this only fires when every Unit has a valid IMEI. For non-IMEI
  orders it fires unconditionally.
- On successful ship: inventory is decremented for every orderpick line
  (`deductForShipment`), the order leaves the open list, the next open
  order is auto-selected, and a success toast fires with a **"Pakbon
  openen"** action so logistics can print before moving on. The same order
  also appears at the top of the Verzonden tab thanks to cross-tab
  invalidation.
- "Versturen" doet eerst een pre-flight stock check via `listInventory()`.
  Als één of meer picked producten te weinig voorraad hebben, wordt een
  `InsufficientStockError` gegooid en het versturen wordt afgebroken —
  niets wordt gemuteerd. De foutmelding ("Geen voorraad beschikbaar")
  noemt de specifieke producten met available/requested.

## Architecture: Zoho-readiness

All persistence goes through service interfaces. There are two:

- **`OrderService`** — `getOpenOrders()`, `getOrderById(id)`,
  `updateOrderUnits(id, units)`, `markAsShipped(id)`,
  `createOrder(draft)` (logistics-created orders),
  `listShippedOrders({ search?, limit? })` (Verzonden-tab feed,
  newest-first, search by ordernumber/account),
  `getShippedOrder(id)` (read-only fetch for the Verzonden workspace).
- **`InventoryService`** — `listInventory()`, `getProduct(productId)`,
  `listProducts()` (catalogue for the picker),
  `registerPurchaseOrder(items, note?)`, `receivePurchaseOrder(poId)`,
  `deletePurchaseOrder(poId)` (only allowed on `'open'` PO's — reverts the
  pending `opBestelling` bump, no movement row),
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

All tabs share the single `QueryClient` constructed in `main.tsx`. The
shipment flow in `useShipOrder` does four things in sequence:

1. `orderService.markAsShipped(id)`
2. `inventoryService.deductForShipment(orderId, picks)` (always — empty
   picks is a service-side no-op)
3. Re-fetches inventory and writes the fresh list back into the cache
4. Invalidates `OPEN_ORDERS_KEY`, `SHIPPED_ORDERS_KEY` and `MOVEMENTS_KEY`,
   and pre-seeds the just-shipped order into the shipped-by-id cache so the
   Verzonden workspace renders immediately when the user clicks through.

So the moment the user switches to the Voorraad or Verzonden tab after
shipping, the decremented stock, new mutation rows, and the freshly-shipped
order are already in the cache — no manual refresh.

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

- **TopNav** (full-width, ~56px tall) with the brand, the tab bar, the
  Mock-data badge (only visible in mock mode), and the active-profile
  badge on the right (clicking it jumps to Settings). Tabs today: `Orders`,
  `Verzonden`, `Voorraad`, `Instellingen`. Component state in `App.tsx`
  switches the body — no router. Adding a tab is one entry in the `TABS`
  array plus a `<NewTab />` mount.
- Tabs are generic: `TopNav` is parameterised on a `TabDefinition<Id>` array,
  so adding a fifth tab does not require any structural change.
- **All four tab bodies stay mounted at all times** — `App.tsx` toggles
  visibility via `display: none` on the inactive ones. This preserves each
  tab's local state (selectedId, search input, etc.) across switches so
  the user lands back where they were instead of on an auto-selected
  default. React Query cache was already shared via the single
  `QueryClient`; this only changes how component-local state survives.

### Orders tab

- Sidebar (left, ~320px) with open-order list + search
- Workspace (right) with order details
- Sales note: if present, shown prominently as an amber warning block — must
  not be missed
- **Three-step shipping flow** in the workspace footer:
  1. **IMEI scannen** — units table with live IMEI validation (skipped for
     non-IMEI orders).
  2. **Inpakken** — footer button is enabled once all IMEIs are valid.
     Click opens the pakbon modal so logistics can inspect/print before
     packing the box. Required step: status text only switches to "klaar
     om te versturen" after the pakbon was opened at least once for this
     order.
  3. **Versturen** — only available after step 2; click marks the order
     `Verstuurd`, deducts inventory, fires the success toast (with another
     "Pakbon openen" action as a safety net).
- The footer button labels rotate through `Inpakken (X/Y)` (incomplete) →
  `Inpakken` (ready) → `Versturen` (packed).
- Switching between open orders resets the inpakken-flag — each order
  needs its own pakbon-check before shipping.

### Verzonden tab

- Sidebar (left, ~320px): all orders with status `Verstuurd`, sorted by
  `shippedAt` desc. Search by ordernumber or account. Per row: ordernumber,
  account, city, units/items count, and a relative date ("vandaag",
  "gisteren", "N dagen geleden") for shipments ≤7 days; older falls back to
  `dd-MM-yyyy`. Search is forwarded to the service so a future Zoho impl
  can scope the API call instead of client-filtering.
- Workspace (right): identical visual structure to the Orders workspace but
  fully **read-only** — `UnitsTable` is reused with `disabled`, no
  Versturen button, no edit affordances. Header carries an emerald
  "Verzonden op {datum}" chip alongside the existing createdAt/quoteOwner
  block.
- **Pakbon-section** at the bottom of the workspace: a single `Pakbon
  openen` button that opens `WaybillViewer` (HTML preview in a modal with
  Sluiten + Printen / opslaan als PDF). The same modal is opened from
  three places: the Verzonden workspace, the Orders-tab "Inpakken" stage,
  and the toast that fires right after shipping.

### Pakbon (waybill) template

- `buildWaybillHtml(order, company?)` (`src/components/waybill/buildWaybillHtml.ts`)
  is a **pure function** that returns a complete `<!DOCTYPE html>...</html>`
  string. Self-contained: all CSS inlined in `<style>`, A4 page size via
  `@page`, no external fonts, no scripts.
- `WaybillViewer` mounts the HTML inside an `<iframe srcDoc={html}>` for
  the preview. The print button calls `iframe.contentWindow.print()` so
  what you see is exactly what gets printed. Save-as-PDF is one click in
  the print dialog ("Microsoft Print to PDF").
- Layout: company header (logo or name fallback), afleveradres block,
  Units table (skipped when `units.length === 0`), Accessoires table
  (skipped when no `hasIMEI === false` orderpick lines), eindtotaal,
  signature line, generated-at footer.
- **Defensive by design** — empty `units`, empty accessoires, missing
  `shippedAt`/`account`/`address`, and absent logo all render gracefully
  (fallback "—" or skipped sections). All dynamic strings are
  HTML-escaped through a local `escape()` helper so a Zoho note containing
  `<script>` or `&` does not break the document.
- Company info lives in `src/config/company.ts` (`COMPANY_INFO`). It's a
  **placeholder constant** committed to the repo — no runtime config, no
  settings screen. Replace the values before going live; logo path stays
  undefined until a `logo.png` lands in `src/assets`, at which point the
  text fallback gives way to the image.
- The pakbon is **never persisted** — Zoho is the source of truth for
  order data, and the PDF is regenerated on demand from the live order
  payload. No archive table, no cached files.
- Pakbon-number is reused from `order.orderNumber` (RCO/LCO ids). No
  separate numbering scheme.

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
- **Voorraad-failover toast**: bij onvoldoende voorraad blokkeert het
  versturen vóór mutatie en toont een duidelijke foutmelding ("Geen
  voorraad beschikbaar") met available/requested per product
- **Destructive confirms**: PO verwijderen + PO aanmaken hebben een
  inline bevestiging-rij (geen modals, geen `window.confirm`) — dezelfde
  Tailwind chrome als de rest van het scherm. Annuleren is altijd een
  expliciete optie; klik-buiten dismist niet
- **`user-select: none` op de body**, met opt-in via `select-text` op
  ordernummer/account/adres/notes/SKU. Voorkomt dat een snelle muis-
  sweep een selectierechthoek over de hele UI sleept (de "modules niet
  statisch" bug). `scrollbar-gutter: stable` op alle scroll containers
  voorkomt kolombreedte-flicker bij content-overflow

No mobile. No playful aesthetic — this is a workstation.

### Theme system

Dark + light themes share a CSS-variable palette (`src/index.css`,
`tailwind.config.js`). Surface and accent colours are exposed as
`--color-surface-*` / `--color-accent-*` and remap automatically when the
`data-theme` attribute on `<html>` flips between `'dark'` and `'light'`.
Components reference Tailwind's `surface-*` / `accent` utilities as
before — no per-component refactor needed.

`text-slate-*` utilities are heavily used as foreground text. Light mode
re-tints them globally via `[data-theme='light'] .text-slate-N` overrides
in `index.css` so contrast inverts cleanly. Light mode does **not** remap
`bg-slate-*` or `border-slate-*`; if a future component uses those for
non-text purposes, expect light-mode polish work.

The user's choice (`'system' | 'light' | 'dark'`) lives in localStorage
under `logistiek.theme`. An inline bootstrap script in `index.html`
applies the resolved theme before React mounts to avoid a dark→light
flash. The `useTheme` hook (`src/hooks/useTheme.ts`) keeps things in sync
at runtime, including OS-preference changes when the user picked
`'system'`.

### Profiles + roles

The app is single-machine and the OS already authenticated the user;
profiles are **identity tagging**, not authentication. Two roles today:

- `logistiek` — daily operator. Can do everything that's part of the
  shipment + receive flow.
- `beheer` — admin. Can additionally adjust stock manually and delete
  purchase orders.

Profile definitions live in `src/config/users.ts`. Editing the list is a
deliberate code change — there is no UI to add/remove profiles. The
active profile is persisted in localStorage under
`logistiek.currentUserId`. The `<ProfilePicker>` renders full-screen on
first run (and after "Wissel profiel"), gating the rest of the app.

`useHasRole(role)` returns true if the active user holds the role.
**Beheer is a superset of logistiek** — `useHasRole('logistiek')` is true
for both roles, so daily-flow gates don't accidentally lock beheer out.

Currently gated to beheer-only:

- Stock-adjust form (`src/components/inventory/StockAdjustForm.tsx`) —
  rendered read-only for logistiek with a "Alleen beheer kan voorraad
  aanpassen" badge.
- PO trash button + confirm bar (`src/components/inventory/OpenPurchaseOrders.tsx`) —
  hidden entirely for logistiek (no point showing a button they can't use).
  "Ontvangen" stays for both roles.

To gate a new action: import `useHasRole` and branch on it. Don't reach
into `localStorage` directly from components.

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
    relativeDate.ts           Relative-day formatter (vandaag/gisteren/N dagen)
                              used by the Verzonden sidebar
  config/
    company.ts                COMPANY_INFO placeholder — pakbon header data
    users.ts                  USERS list (logistiek + beheer profiles) +
                              UserRole / UserProfile types
  contexts/
    CurrentUserContext.tsx    Active-profile React context (provider +
                              useCurrentUser/useCurrentUserOrNull/useHasRole)
  services/
    orderService.ts           Interface (incl. createOrder + OrderDraft +
                              listShippedOrders/getShippedOrder)
    mockOrderService.ts       In-memory impl (LCO numbering, auto-generates
                              Units for IMEI products on createOrder, sets
                              shippedAt on markAsShipped, filters/sorts the
                              shipped feed)
    zohoOrderService.ts       Tauri-invoke shim (live mode); createOrder
                              rejects pending business decision; shipped
                              feed calls zoho_fetch_shipped_orders
    inventoryService.ts       Interface (incl. listProducts catalogue)
    mockInventoryService.ts   In-memory impl
    zohoCatalogService.ts     Live product catalogue (Zoho Products module)
    index.ts                  Façade — picks mock vs. live per service
  hooks/
    useOrders.ts              React Query hooks (useShipOrder composes
                              inventory deduction; useCreateOrder for the
                              new-order flow; useShippedOrders/useShippedOrder
                              for the Verzonden tab)
    useInventory.ts           Inventory + catalogue hooks; exports query keys
    useAppUpdate.ts           Auto-update prompt
    useTheme.ts               Theme choice (system/light/dark) + resolved
                              theme + persistence; subscribes to OS pref
                              changes when in 'system' mode
  components/
    TopNav.tsx                Generic tab bar
    ProductPicker.tsx         Searchable single-select combobox over the
                              catalogue (used in NewOrderForm)
    UpdatePrompt.tsx
    orders/                   Orders-tab UI (Sidebar, OrderWorkspace,
                              UnitsTable, OrderpickList, NotesPanel,
                              StatusBadge, EmptyState, NewOrderForm,
                              OrdersTab)
    shipped/                  Verzonden-tab UI (ShippedSidebar,
                              ShippedWorkspace, ShippedTab) — read-only,
                              hosts the pakbon button
    waybill/                  Pakbon (waybill): buildWaybillHtml (pure HTML
                              generator, A4 + inline CSS), WaybillViewer
                              (modal + iframe preview + system print)
    inventory/                Voorraad-tab UI (InventoryTab, InventoryTable,
                              InventoryDetail, StockAdjustForm,
                              PurchaseOrderForm, OpenPurchaseOrders,
                              MovementsList) — StockAdjustForm + PO trash
                              are gated to beheer-only
    settings/                 Instellingen-tab UI (SettingsTab,
                              ThemeSection, ProfileSection,
                              AccountsSection, AppInfoSection,
                              ProfilePicker, RoleBadge)
  App.tsx                     Top-level tab switch + first-run profile gate
  main.tsx                    Single QueryClient + CurrentUserProvider

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
