# RouteConnect Logistiek

Interne desktop-applicatie voor het logistiek team van Allsetra. Hier prepen
medewerkers RouteConnect tracking-devices (Eco5, HCV5-Lite, Smart5): IMEI's
invullen, valideren, en de order als verstuurd markeren. Orderbron is Zoho CRM
— deze app is een gefocuste werkomgeving die alleen toont wat voor logistiek
relevant is.

> **Status: prototype.** De app draait op mock data. De Zoho CRM-integratie
> komt in een volgende fase — de servicelaag is er al op ingericht.

## Stack

| Onderdeel         | Keuze                          |
|-------------------|--------------------------------|
| Desktop shell     | Tauri 2 (Rust + WebView2)      |
| Framework         | React 18                       |
| Build tool        | Vite 5                         |
| Taal              | TypeScript 5 (strict) + Rust   |
| Styling           | Tailwind CSS 3                 |
| Data fetching     | TanStack Query 5               |
| Toast feedback    | Sonner                         |
| Iconen            | lucide-react                   |

**Tauri gekozen boven Electron** omdat:

- Installer is ~5 MB i.p.v. ~150 MB (Tauri gebruikt de al aanwezige
  Windows WebView2, Electron bundelt Chromium).
- Rust backend heeft een kleiner aanvalsoppervlak — belangrijk omdat hier
  straks de Zoho Client Secret & Refresh Token leven.
- Opstarttijd en RAM-gebruik zijn significant lager.

## Voor de eindgebruiker (logistiek medewerker)

Eén download en je bent klaar:

1. Ga naar de [Releases pagina](https://github.com/YaroslavSavchenk/allsetra-logistic/releases)
2. Download de laatste `.msi` of `.exe`
3. Dubbelklik, installeer, klaar — geen configuratie nodig
4. Daarna **updatet de app zichzelf automatisch**: bij elke start wordt
   gecheckt of er een nieuwere versie is; als dat zo is verschijnt
   rechtsonder een notificatie met "Nu updaten" / "Later"

Eventuele secrets (Zoho API sleutels straks) zijn nooit zichtbaar — ze zitten
óf gecompileerd in de Rust-binary (niet leesbaar als tekst), óf in de
Windows Credential Manager, óf worden pas per installatie via een inlog
aangemaakt. **Geen `.env` bestand op de werkstations.**

## Een nieuwe versie uitbrengen (voor developers)

```bash
# 1. Bump versie in package.json en src-tauri/tauri.conf.json
# 2. Commit en tag
git tag v0.2.0
git push origin v0.2.0
```

Dat triggert `.github/workflows/release.yml`:

1. Windows-runner compileert het Rust + TS project
2. Tekent de installers met de Ed25519 key uit GitHub Secrets
   (`TAURI_SIGNING_PRIVATE_KEY`)
3. Genereert `latest.json` update manifest
4. Publiceert als draft GitHub Release met `.msi` + `.exe` + `latest.json`

Zodra de release gepubliceerd is (promote de draft), zien ALLE geïnstalleerde
apps binnen een paar minuten de update.

Lokaal bouwen zonder CI kan ook — zie "Zelf bouwen" hieronder.

## Vereisten (alleen voor ontwikkelen)

- **Node.js 18+** — voor de frontend
- **Rust 1.77+ (stable)** — voor de Tauri Rust backend.
  Install: [rustup.rs](https://rustup.rs)
- **Platform libs**:
  - **Windows**: WebView2 runtime (standaard aanwezig op Windows 11; op
    Windows 10 via Edge update). Geen extra libs nodig.
  - **macOS**: Xcode command line tools.
  - **Linux / WSL2 met WSLg**:
    ```bash
    sudo apt install -y pkg-config libwebkit2gtk-4.1-dev libssl-dev \
      libgtk-3-dev librsvg2-dev libayatana-appindicator3-dev \
      libjavascriptcoregtk-4.1-dev build-essential curl wget file
    ```

## Draaien

### Puur in de browser (snelste UI-iteratie)

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + productie frontend-build naar dist/
npm run typecheck    # alleen TypeScript check
```

### Native Tauri venster

```bash
npm run tauri:dev    # native venster met HMR
```

De allereerste `tauri:dev` compileert de hele Rust dependency tree — neem
5-10 min de tijd. Daaropvolgende runs zijn incrementeel. Werkt op Windows uit
de doos; op WSL/Linux eerst de platform libs installeren (zie Vereisten).

### IMEI-regressietest

```bash
npx tsx scripts/test-imei.ts
```

## Zelf bouwen

**Windows** (primair target):

```powershell
npm ci
npm run tauri:build
```

Producten landen in `src-tauri/target/release/bundle/`:
- `msi/RouteConnect Logistiek_0.1.0_x64_en-US.msi`
- `nsis/RouteConnect Logistiek_0.1.0_x64-setup.exe`

**macOS / Linux**: hetzelfde commando, maar produceert .dmg / .deb / .AppImage.
Let op: `tauri:build` bouwt alleen voor het **huidige platform**. Voor een
Windows installer gebruik je Windows of de GitHub Actions workflow — niet
WSL/Linux.

## Projectstructuur

```
src/                          Frontend (React + TS)
├── types/order.ts            Domein types
├── data/mockData.ts          Mock orders (ENIGE plek voor sample data)
├── lib/
│   ├── imei.ts               Pure functies: validateImei(), detectDeviceType()
│   └── format.ts             Datum/tijd formatter (nl-NL)
├── services/
│   ├── orderService.ts       OrderService interface (contract)
│   ├── mockOrderService.ts   Mock implementatie
│   └── index.ts              Service injection point
├── hooks/useOrders.ts        React Query hooks
├── components/               Sidebar, OrderWorkspace, UnitsTable, …
├── App.tsx
└── main.tsx

src-tauri/                    Desktop shell (Rust)
├── Cargo.toml
├── tauri.conf.json           App config, window, CSP, bundle targets
├── build.rs
├── src/
│   ├── main.rs               Entry point
│   └── lib.rs                Tauri builder (plugins, setup)
├── capabilities/default.json Permission ACL
└── icons/                    App icons (generated door tauri init)

scripts/
└── test-imei.ts              Standalone IMEI validatie tests
```

## Business rules (samenvatting)

- Logistiek ziet alleen orders met status `Nieuw` of `In behandeling`.
- IMEI's zijn 15 cijfers, alleen cijfers, prefix bepaalt het device type:
  - `861…` of `8637…` → Eco5
  - `8635…` → HCV5-Lite
  - `864…` → Smart5
- Het gedetecteerde type moet matchen met het verwachte type van de unit.
- IMEI's mogen niet dubbel voorkomen binnen dezelfde order.
- "Versturen" werkt pas als **alle** units een geldige IMEI hebben.
- Een open order schuift automatisch naar `In behandeling` zodra er wordt
  ingevuld; naar `Verstuurd` na een succesvolle versturen-actie (daarna
  verdwijnt hij uit de lijst).

Volledige regels staan in [`CLAUDE.md`](./CLAUDE.md).

## Mock data

Alle sample orders staan in [`src/data/mockData.ts`](./src/data/mockData.ts).

**Nieuwe order toevoegen**: voeg een entry toe aan de `MOCK_ORDERS` array.
Belangrijk:

- `units` array moet matchen met de device-aantallen uit `orderpick`
  (accessoires zoals "ID Reader" en "Buzzer" tellen niet — die hebben geen
  IMEI).
- `units[i].type` moet het verwachte device type zijn.
- `status` is `'Nieuw'` voor nieuwe orders, `'In behandeling'` voor deels
  ingevulde orders.
- `createdAt` als ISO string — oudste orders staan bovenaan in de sidebar.

## Zoho integratie

De Rust-kant van Tauri praat direct met Zoho CRM — geen losse backend. De
frontend roept Tauri commands aan via `@tauri-apps/api`; de `OrderService`
façade in `src/services/index.ts` switcht automatisch tussen mock en live op
basis van of de Rust binary met Zoho secrets gecompileerd is.

```
src-tauri/src/zoho/
├── config.rs     — env-baked constants, module/field name mappings
├── error.rs       — ZohoError (Serializable naar JS via IPC)
├── models.rs      — Order/Unit/OrderNote (camelCase JSON → TS types)
├── client.rs      — HTTP + OAuth refresh flow + 1h token cache + retry op 401
├── mapper.rs      — Zoho JSON → Order (defensief: onbekende velden = leeg)
└── commands.rs    — 5 #[tauri::command]: is_configured, fetch_open_orders,
                    fetch_order (met notes), update_units, ship_order
```

### Stap 1 — Zoho Self Client aanmaken

1. Login op https://api-console.zoho.eu als Zoho admin
2. "Add Client" → "Self Client" → kopieer **Client ID** en **Client Secret**
3. Tab "Generate Code":
   - Scope: `ZohoCRM.modules.custom.READ,ZohoCRM.modules.custom.UPDATE,ZohoCRM.notes.ALL`
   - Time duration: 10 minuten (je ruilt hem zo in)
   - Scope Description: vrij invullen
   - Genereer → krijg grant code
4. Ruil direct in voor refresh + access token:
   ```bash
   curl -X POST https://accounts.zoho.eu/oauth/v2/token \
     -d "grant_type=authorization_code" \
     -d "client_id=..." \
     -d "client_secret=..." \
     -d "code=<grant code>" \
     -d "redirect_uri=https://accounts.zoho.eu"
   ```
5. Bewaar de **refresh_token** uit de response — die is forever geldig.

### Stap 2 — Secrets uploaden naar GitHub

```bash
echo -n "<client_id>"     | gh secret set ZOHO_CLIENT_ID
echo -n "<client_secret>" | gh secret set ZOHO_CLIENT_SECRET
echo -n "<refresh_token>" | gh secret set ZOHO_REFRESH_TOKEN

# Optioneel — de defaults gaan uit van EU sandbox + module "RouteConnectOrders_test"
echo -n "https://www.zohoapis.eu"        | gh secret set ZOHO_API_BASE        # voor prod
echo -n "<jouw_module_api_naam>"          | gh secret set ZOHO_MODULE
```

### Stap 3 — Field-namen bevestigen

De field API-namen in `src-tauri/src/zoho/config.rs` zijn **gokken uit het
project plan**. Haal één bestaande order op om ze te verifiëren:

```bash
# krijg access token
ACCESS_TOKEN=$(curl -s -X POST https://accounts.zoho.eu/oauth/v2/token \
  -d "grant_type=refresh_token&client_id=...&client_secret=...&refresh_token=..." \
  | jq -r .access_token)

# haal één order op
curl -s -H "Authorization: Zoho-oauthtoken $ACCESS_TOKEN" \
  "https://sandbox.zohoapis.eu/crm/v8/RouteConnectOrders_test/<record_id>" | jq
```

Vergelijk de JSON keys met de `FIELD_*` constants in `config.rs`. Pas aan
waar nodig.

### Stap 4 — Tag en bouw

```bash
git tag v0.2.0 && git push origin v0.2.0
```

CI bakt de secrets als compile-time env vars de Rust binary in — ze zitten
niet als string in het frontend bundle. Geïnstalleerde apps zien binnen
~30 min de update via de auto-updater.

### Runtime gedrag

- **Lijst ophalen**: `zoho_fetch_open_orders` doet één search-call met
  criterium `(Status:equals:Nieuw) OR (Status:equals:In behandeling)` — dus
  zonder vooraf ingerichte Custom View nodig.
- **Order detail**: `zoho_fetch_order` fetcht tegelijk de order EN z'n notes
  (parallel `tokio::join!`); de app poll dit elke 30s zolang de order
  geopend is zodat nieuwe/bijgewerkte notes live in beeld komen.
- **Units updaten**: `zoho_update_units` stuurt de **volledige** Units array
  in één PUT. Zoho's subformulier gedrag: ontbrekende rijen → verwijderd. We
  sturen altijd alles.
- **Versturen**: `zoho_ship_order` zet `Status = "Verstuurd"` en de order
  valt uit de lijst bij de volgende `search()` call.
- **Token**: 1u access token cached in Rust Mutex, refresht 60s voor expiry.
  Bij 401 wordt cache gedumpt en de request één keer geretry'd.

### Fallback

Zolang `ZOHO_CLIENT_ID` / `_SECRET` / `_REFRESH_TOKEN` in de build niet
gezet zijn:

- `zoho_is_configured` → false
- `src/services/index.ts` houdt `MockOrderService` aan
- De app werkt op mock data zodat dev/preview-builds altijd bruikbaar zijn

Zoho-specifieke details (EU datacenter, OAuth Self Client flow,
subformulier-valkuilen) staan in het oorspronkelijke project plan.

## Auto-update — hoe het werkt

- Bij opstart doet de app een `check()` tegen de GitHub Releases update
  manifest (`latest.json`).
- Als `version > huidige versie`, verschijnt de `UpdatePrompt` card
  rechtsonder. Gebruiker klikt "Nu updaten" of "Later".
- Tauri downloadt het gesigneerde updater-artifact, **verifieert de signature
  met de public key die in `tauri.conf.json` staat**, en installeert.
- De gebruiker klikt "Herstarten" en is op de nieuwe versie.

De public key zit vast in elke installer. Een aanvaller kan geen valse update
injecteren — elke update moet met de overeenkomende private key (alleen in
GitHub Secrets) gesigneerd zijn.

### Signing keys

- **Public key**: staat in `src-tauri/tauri.conf.json` onder
  `plugins.updater.pubkey` — veilig te committen
- **Private key**: GitHub Secret `TAURI_SIGNING_PRIVATE_KEY` — **nooit
  committen**. Lokale backup in `~/.tauri-keys/routeconnect` (houd dit veilig,
  bijv. in 1Password/Bitwarden — als je het kwijtraakt kunnen geïnstalleerde
  apps geen updates meer accepteren en moet iedereen opnieuw installeren).
- Genereren/roteren:
  ```bash
  npx tauri signer generate --write-keys ~/.tauri-keys/routeconnect --password ""
  ```
  Daarna: update `pubkey` in `tauri.conf.json`, en upload de private key:
  ```bash
  gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri-keys/routeconnect
  ```

## Bekende beperkingen

- Mock service draait in-memory — een reload reset alle progressie. Opzettelijk
  voor het prototype; de echte backend zal persistent zijn.
- Geen authenticatie in de app zelf — aangenomen wordt dat de workstation
  vertrouwd is.
- Alleen desktop layout (geen mobile breakpoints).
- Geen automatische test suite buiten het IMEI-regressie script.
- IMEI input strippt non-digits automatisch; "alleen cijfers"-foutmelding is
  daardoor in de praktijk moeilijk te triggeren vanuit de UI.
- `tauri:build` produceert alleen de installer voor het huidige platform —
  voor Windows `.msi` bouw je op Windows of via de CI workflow.
- Auto-update vereist internet bij opstart. Bij offline werkstation blijft de
  app gewoon werken op de geïnstalleerde versie.
