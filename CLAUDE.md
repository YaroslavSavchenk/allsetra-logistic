# RouteConnect Logistiek App

Internal desktop web app for the logistics team handling shipments of RouteConnect
tracking devices (Eco5, HCV5-Lite, Smart5). Orders originate in Zoho CRM; this app
is a focused workspace where logistics prepares orders, scans IMEIs, and marks
them as shipped.

This first version runs on mock data. A later phase will plug in the real Zoho CRM
API — the architecture must be ready for that swap without a rewrite.

## Tech stack

- **Desktop shell**: Tauri 2 (Rust + system WebView2 on Windows)
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

## Language conventions

- **UI text (labels, messages, toasts, errors)**: Dutch
- **Code, identifiers, comments, commits**: English

## Data model

Source of truth lives in `src/types/order.ts`. An `Order` has status, account,
address, an `orderpick` list (what must be shipped, read-only from sales), and a
`units` list (one per device that needs an IMEI).

Statuses: `Ter goedkeuring` | `Nieuw` | `In behandeling` | `Verstuurd`.
Logistics only sees `Nieuw` and `In behandeling`. `Ter goedkeuring` is
sales-only; `Verstuurd` is done.

Device types: `Eco5` | `HCV5-Lite` | `Smart5`. Accessoires (ID Reader, Buzzer)
appear in `orderpick` but do **not** generate Units — they have no IMEI.

## Business rules

### IMEI → device type detection

| Prefix         | Type       |
|----------------|------------|
| `861…`, `8637…` | Eco5       |
| `8635…`         | HCV5-Lite  |
| `864…`          | Smart5     |

The detected type must match the Unit's expected type (pre-filled from the
orderpick). Mismatch = invalid.

### IMEI validation (all must hold)

1. Exactly 15 digits
2. Digits only — no spaces, dashes, letters
3. Prefix maps to a known type
4. Detected type matches the Unit's expected type
5. Not duplicated within the same order

Validate **live as the user types** — no blur/submit gating.

### Status transitions

- Starts `Nieuw`. Moves to `In behandeling` when logistics starts editing.
- "Versturen" transitions to `Verstuurd` **only** if every IMEI is valid.
  One invalid/missing IMEI blocks the whole order.
- After successful ship: remove from the list and auto-select the next open order.

## Architecture: Zoho-readiness

All order access goes through an `OrderService` interface with methods like
`getOpenOrders()`, `getOrderById(id)`, `updateOrderUnits(id, units)`,
`markAsShipped(id)`. The current implementation is `MockOrderService`. Later a
`ZohoOrderService` plugs in behind the same interface. **Components must not
reach into the mock array directly** — always go through the service.

### Where secrets live

**Never in `.env`.** A .env is baked into the frontend bundle (or readable
inside the installer), so anything sensitive there leaks to whoever extracts
the app. The rule:

| Data                     | Where                                       |
|--------------------------|---------------------------------------------|
| `ZOHO_CLIENT_ID`         | `.env` — semi-public identifier, OK          |
| `ZOHO_API_BASE`, module  | `.env` — config, not secret                  |
| `ZOHO_CLIENT_SECRET`     | **OS keyring** (Windows Credential Manager)  |
| `ZOHO_REFRESH_TOKEN`     | **OS keyring**                               |
| Access token             | In-memory only, never persisted              |

Use the Rust side to read/write the keyring — candidates: the `keyring` crate
(thin wrapper over Win/Mac/Linux secret stores) or `tauri-plugin-stronghold`
(encrypted vault file with a password; cross-platform). Expose typed Tauri
commands (`#[tauri::command]`) so the frontend calls into Rust via
`@tauri-apps/api/core`.

### Service wiring

When Zoho lands:
- `ZohoOrderService` on the TypeScript side just forwards to Tauri commands
  (`invoke('fetch_open_orders')`, etc.) — no HTTP clients in the frontend
- Rust owns: OAuth refresh flow, access-token cache (in-memory, 1-hour TTL),
  retry/backoff, and talking to the Zoho REST API
- `src/services/index.ts` swaps `MockOrderService` → `ZohoOrderService`;
  components don't change

### Zoho gotchas

- Zoho subformulier updates require sending **all rows** — missing rows get
  deleted by Zoho. Always round-trip the full `Units` array.
- Refresh token never expires unless revoked; access token is 1 hour.
- EU datacenter, sandbox URL `https://sandbox.zohoapis.eu`.
- Module API name `RouteConnectOrders_test` (confirm in Zoho setup).

Full Zoho reference (OAuth Self Client flow, endpoint list, required scopes)
is in the original project plan — reread it before integration.

## UI direction

Desktop-only. Functional and fast — logistics processes these in high tempo, so
minimize clicks and keep feedback immediate.

- **Layout**: sidebar (left, ~320px) with order list + search; main workspace
  right with order details
- **Sales note**: if present, shown prominently as a warning block — must not be
  missed
- **Units table**: one row per unit with expected type (read-only), IMEI input
  (monospace), live validation indicator
- **Ship button**: large, bottom of the workspace, disabled until every IMEI is
  valid. Shows progress like "3/5 units klaar"
- **Barcode scanner support**: IMEI inputs must handle scanner input (types +
  Enter). On Enter, move focus to the next IMEI field
- **Keyboard-first**: Tab between fields, Enter to advance — no mouse required
  for the core task
- **Feedback**: toast notifications, not modals

No mobile. No playful aesthetic — this is a workstation.

## Project layout

```
src/                          Frontend (React + TS)
  types/          Domain types (Order, Unit, OrderStatus, DeviceType)
  data/           mockData.ts — realistic sample orders
  services/       OrderService interface + MockOrderService impl
  lib/            IMEI validation, type detection (pure functions)
  components/     UI components
  hooks/          React Query hooks that wrap the service
  App.tsx
  main.tsx

src-tauri/                    Desktop shell (Rust)
  Cargo.toml
  tauri.conf.json              Window, CSP, bundle targets
  src/main.rs, src/lib.rs     Tauri builder, plugins, future Zoho commands
  capabilities/default.json   Permission ACL
  icons/                       Generated by tauri init

.github/workflows/release.yml CI — builds Windows installer on tag push
```

Mock data lives in exactly one file (`src/data/mockData.ts`) so the Zoho swap
has a single replacement point.

## Out of scope (this version)

Real Zoho API, auth for logistics users, mobile views, sales approval flow,
dashboards, archive, admin panel, Docker/deploy config, automated tests.
