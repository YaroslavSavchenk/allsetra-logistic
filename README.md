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

## Zoho integratie — voorbereid, nog niet geactiveerd

De frontend praat met orders via één interface:

```ts
// src/services/orderService.ts
interface OrderService {
  getOpenOrders(): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | null>;
  updateOrderUnits(id: string, units: Unit[]): Promise<Order>;
  markAsShipped(id: string): Promise<Order>;
}
```

De injectie in `src/services/index.ts` wijst nu naar `MockOrderService`. Twee
routes om Zoho aan te sluiten:

**Route A — Rust zelf (aanbevolen voor deze desktop-context)**

De Tauri Rust-kant praat rechtstreeks met Zoho. Client Secret + Refresh Token
worden opgeslagen in de OS keyring via `tauri-plugin-stronghold` of in een
lokaal encrypted bestand via `tauri-plugin-store`. Een `ZohoOrderService`
wrapper in `src/services/` roept Rust commands aan via `@tauri-apps/api`.

Voordeel: één deployable. Geen losse backend te runnen/updaten.

**Route B — Losse backend proxy**

Node/FastAPI backend bewaart tokens server-side, Tauri frontend praat alleen
met de backend. Zelfde patroon als klassieke webapps.

Zoho-specifieke details (EU datacenter, module `RouteConnectOrders_test`,
OAuth 2.0 Self Client flow, relevante endpoints, subformulier-valkuilen) staan
in het oorspronkelijke project plan. Lees dat voordat je begint aan de
integratie.

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
