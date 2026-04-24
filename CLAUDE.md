# RouteConnect Logistiek App

Internal desktop web app for the logistics team handling shipments of RouteConnect
tracking devices (Eco5, HCV5-Lite, Smart5). Orders originate in Zoho CRM; this app
is a focused workspace where logistics prepares orders, scans IMEIs, and marks
them as shipped.

This first version runs on mock data. A later phase will plug in the real Zoho CRM
API — the architecture must be ready for that swap without a rewrite.

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
- `commands.rs` — 5 `#[tauri::command]`s: `zoho_is_configured`,
  `zoho_fetch_open_orders`, `zoho_fetch_order` (joins notes in parallel),
  `zoho_update_units`, `zoho_ship_order`

The TS `ZohoOrderService` is a thin invoker. `src/services/index.ts` is a
façade that probes `zoho_is_configured` once at load time and picks between
mock and live — so dev (`npm run dev` in browser) and Tauri-without-secrets
both work on mock, while CI builds with secrets baked in go live.

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
