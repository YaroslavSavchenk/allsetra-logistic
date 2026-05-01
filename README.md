# Logistiek Allsetra

Interne desktop-applicatie voor het logistiek team van Allsetra. De app is
gestart als IMEI-flow voor RouteConnect tracking-devices (Eco5, HCV5-Lite,
Smart5) en doet inmiddels alle logistiek: tracker-orders met IMEI's, plus
productlijnen zonder IMEI (accessoires, fietsbeveiliging, sensors). Vier
tabs bovenaan: **Orders** (klantorders prepen + versturen, óf zelf een
order aanmaken voor ad-hoc verzendingen), **Verzonden** (alle verstuurde
orders met pakbon-PDF — openen, printen, downloaden), **Voorraad** (per
product de stand, openstaande inkooporders en mutatiehistorie) en
**Instellingen** (thema-keuze, profielwissel, app-info).

Twee orderstromen:

- **Sales-orders** komen uit Zoho CRM — sales maakt de quote, logistiek ziet
  de open orders zodra ze status `Nieuw` hebben.
- **Logistiek-orders** maakt het team zelf via "**+ Nieuwe order**" in de
  Orders-sidebar — voor verzendingen zonder sales-quote (interne overdracht,
  spoed, alleen accessoires). Krijgen een `LCO-…` nummer en lopen daarna
  precies dezelfde flow als sales-orders.

De productlijst voor de picker komt uit de Zoho Products module (live mode)
of uit de lokale productregistratie (mock mode); de UI is hetzelfde.

> **Status: prototype.** De app draait op mock data. De Zoho CRM-integratie
> (orders) komt in een volgende fase — de servicelaag is er al op ingericht.
> De voorraadkant heeft geen Zoho-tegenhanger op dit moment; alleen mock.

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
| Pakbon            | HTML + system print dialog     |

**Tauri gekozen boven Electron** omdat:

- Installer is ~5 MB i.p.v. ~150 MB (Tauri gebruikt de al aanwezige
  Windows WebView2, Electron bundelt Chromium).
- Rust backend heeft een kleiner aanvalsoppervlak — belangrijk omdat hier
  straks de Zoho Client Secret & Refresh Token leven.
- Opstarttijd en RAM-gebruik zijn significant lager.

**Pakbon = HTML + system print** in plaats van een PDF-library: de eerste
poging met `@react-pdf/renderer` rendert via een `blob:` iframe-URL die de
Tauri CSP blokkeert (modal blijft leeg). HTML in een `srcDoc` iframe +
`iframe.contentWindow.print()` werkt 100% in WebView2, gebruikt de native
print-pipeline (scherper dan canvas-rasterisering), en de gebruiker kan
"Microsoft Print to PDF" kiezen om als PDF op te slaan. Eén template
(`buildWaybillHtml`) wordt hergebruikt voor élke order.

## Voor de eindgebruiker (logistiek medewerker)

Eén download en je bent klaar:

1. Ga naar de [Releases pagina](https://github.com/YaroslavSavchenk/allsetra-logistic/releases)
2. Download de laatste `.msi` of `.exe`
3. Dubbelklik, installeer, en kies bij de eerste start je profiel
   (logistiek of beheer) — geen wachtwoord, geen configuratie
4. Daarna **updatet de app zichzelf automatisch**: bij elke start wordt
   gecheckt of er een nieuwere versie is; als dat zo is verschijnt
   rechtsonder een notificatie met "Nu updaten" / "Later"

Onder **Instellingen** kun je het thema (donker/licht/systeem) wisselen
en op een ander profiel overstappen. Beheer-rollen kunnen daarnaast
voorraad handmatig aanpassen en inkooporders verwijderen — voor
logistiek staat dat uit.

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
- `msi/Logistiek Allsetra_0.1.0_x64_en-US.msi`
- `nsis/Logistiek Allsetra_0.1.0_x64-setup.exe`

**macOS / Linux**: hetzelfde commando, maar produceert .dmg / .deb / .AppImage.
Let op: `tauri:build` bouwt alleen voor het **huidige platform**. Voor een
Windows installer gebruik je Windows of de GitHub Actions workflow — niet
WSL/Linux.

## Projectstructuur

```
src/                          Frontend (React + TS)
├── types/
│   ├── order.ts              Order, Unit, OrderpickItem, OrderStatus
│   ├── product.ts            Product, ProductCategory
│   └── inventory.ts          InventoryItem, InventoryMovement, PurchaseOrder
├── data/
│   ├── mockData.ts           Mock orders (ENIGE plek voor order sample data)
│   └── mockInventory.ts      Mock voorraad + open inkooporders
├── lib/
│   ├── productStrategy.ts    Productregistratie + IMEI-prefix index
│   ├── imei.ts               Pure functies: validateImei(), detectProductFromImei()
│   ├── format.ts             Datum/tijd formatter (nl-NL)
│   └── relativeDate.ts       Relatieve datum (vandaag/gisteren/N dagen geleden)
├── config/
│   └── company.ts            COMPANY_INFO — placeholder pakbon-bedrijfsgegevens
├── services/
│   ├── orderService.ts       OrderService interface (incl. createOrder +
│   │                         listShippedOrders/getShippedOrder)
│   ├── mockOrderService.ts   Mock implementatie (LCO-numbering, shippedAt)
│   ├── zohoOrderService.ts   Tauri-invoke shim (live mode)
│   ├── inventoryService.ts   InventoryService interface (incl. listProducts)
│   ├── mockInventoryService.ts
│   ├── zohoCatalogService.ts Live productlijst uit Zoho Products module
│   └── index.ts              Façade — kiest mock of live per service
├── hooks/
│   ├── useOrders.ts          Orders + composeert deductForShipment in useShipOrder
│   │                         + useShippedOrders/useShippedOrder
│   ├── useInventory.ts       Voorraad-hooks; exporteert query-keys
│   └── useAppUpdate.ts       Auto-update prompt
├── components/
│   ├── TopNav.tsx            Generieke tab-balk
│   ├── ProductPicker.tsx     Searchable combobox over de catalogus
│   ├── UpdatePrompt.tsx
│   ├── orders/               OrdersTab + Sidebar, OrderWorkspace,
│   │                         NewOrderForm, …
│   ├── shipped/              Verzonden tab — ShippedTab, ShippedSidebar,
│   │                         ShippedWorkspace (read-only + pakbon-knop)
│   ├── waybill/              Pakbon: buildWaybillHtml (HTML-generator),
│   │                         WaybillViewer (modal met iframe-preview +
│   │                         system print)
│   └── inventory/            InventoryTab + tabel/detail/forms/audit
├── App.tsx                   Tab-switch
└── main.tsx                  Single QueryClient

src-tauri/                    Desktop shell (Rust)
├── Cargo.toml
├── tauri.conf.json           App config, window, CSP, bundle targets
├── build.rs
├── src/
│   ├── main.rs               Entry point
│   ├── lib.rs                Tauri builder (plugins, setup)
│   └── zoho/                 Zoho client (alleen orders; voorraad is mock-only)
├── capabilities/default.json Permission ACL
└── icons/                    App icons (generated door tauri init)

scripts/
└── test-imei.ts              Standalone IMEI validatie tests
```

## Business rules (samenvatting)

- Orders hebben een `source`: `'zoho'` (uit CRM) of `'logistics'` (zelf
  gemaakt). De flow is identiek; het verschil zit in herkomst en
  ordernummer-prefix (`RCO-…` vs `LCO-…`).
- Logistiek ziet alleen orders met status `Nieuw` of `In behandeling`.
- IMEI's zijn 15 cijfers, alleen cijfers, prefix bepaalt het product (via
  `lib/productStrategy.ts`, longest-prefix wins):
  - `861…` of `8637…` → RouteConnect Eco5
  - `8635…` → RouteConnect HCV5-Lite
  - `864…` → RouteConnect Smart5
- Het gedetecteerde product moet matchen met het verwachte product van de unit.
- IMEI's mogen niet dubbel voorkomen binnen dezelfde order.
- Producten zonder IMEI (accessoires, fietsbeveiliging, sensors) staan wel
  in `orderpick` maar hebben geen Units — er is geen IMEI-invoer voor.
- **Drie-stappen flow** in de Orders-tab: (1) IMEI scannen, (2) Inpakken
  (opent pakbon — verplicht voordat de Versturen-knop verschijnt), (3)
  Versturen. Voor orders zonder IMEI-producten begint de flow direct bij
  stap 2.
- Een open order schuift automatisch naar `In behandeling` zodra er een IMEI
  wordt ingevuld; naar `Verstuurd` na een succesvolle versturen-actie. Hij
  verdwijnt uit de Orders-lijst en verschijnt boven in de Verzonden-tab,
  inclusief direct bruikbare pakbon-knop.
- Direct na verzending verschijnt nóg een toast met **Pakbon openen** —
  vangnet voor het geval logistiek bij de inpakken-stap niet heeft geprint.
- Bij versturen doet de app eerst een pre-flight voorraadcheck. Als één
  of meer producten uit `orderpick` te weinig `opVoorraad` hebben, wordt
  het versturen geblokkeerd vóór er iets gemuteerd wordt en verschijnt de
  toast "Geen voorraad beschikbaar" met per product available/requested.
  Slaagt de check, dan worden de aantallen uit `orderpick` afgeschreven
  van `opVoorraad`.

Volledige regels staan in [`CLAUDE.md`](./CLAUDE.md).

## Productregistratie

Eén bestand bepaalt welke producten de app kent:
[`src/lib/productStrategy.ts`](./src/lib/productStrategy.ts).

Per product: `id`, `sku`, `name`, `category`, `hasIMEI`, `supplier`. Voor
producten met IMEI ook een lijst prefixes voor automatische detectie.

**Nieuw product toevoegen**: voeg een entry toe aan `DEFINITIONS`. UI
componenten resolven namen via `getProduct(id)` / `getProductName(id)`, dus
verder hoeft er niets aangepast.

**Nieuwe IMEI-tracker familie**: zelfde — definieer het product met
`hasIMEI: true` en de prefixes. De validator herkent het direct.

## Mock data

Twee bestanden, één per domein:

- [`src/data/mockData.ts`](./src/data/mockData.ts) — sample klantorders
- [`src/data/mockInventory.ts`](./src/data/mockInventory.ts) — voorraad +
  open inkooporders

Beide refereren producten alleen via hun `id` uit `productStrategy.ts`.

**Nieuwe order toevoegen** (`mockData.ts`):

- `orderpick[i].productId` moet bestaan in de productregistratie.
- `units` is alleen aanwezig voor IMEI-producten; aantal moet matchen met
  `orderpick.quantity` voor dat product.
- `units[i].productId` is het verwachte product van die unit.
- `status` is `'Nieuw'` voor nieuwe orders, `'In behandeling'` voor deels
  ingevulde orders.
- `createdAt` als ISO string — oudste orders staan bovenaan in de sidebar.

**Nieuwe voorraad-rij** (`mockInventory.ts`): één entry per `productId` met
`opVoorraad`, `opBestelling`, `lastMovementAt`. Open `MOCK_PURCHASE_ORDERS`
voor een seed inkooporder.

**Verstuurde mock-orders**: `mockData.ts` bevat 4 voorbeeld-orders met
status `Verstuurd` zodat de Verzonden-tab niet leeg is bij eerste start
(twee tracker-orders, één met alleen accessoires/fietsbeveiliging, en één
logistics-created LCO-order). Alle vier hebben een `shippedAt` zodat ze in
de Verzonden-sidebar verschijnen op verzenddatum.

## Pakbon

Elke order heeft een **pakbon** — A4-portrait HTML-document, gegenereerd
uit de live order-data via [`buildWaybillHtml`](./src/components/waybill/buildWaybillHtml.ts).
Geen PDF-library, geen archief: Zoho is bron van waarheid en de pakbon
wordt elke keer opnieuw opgebouwd. Eén template voor alle productlijnen.

De viewer toont de pakbon in een iframe (zelfde HTML als wat geprint
wordt — WYSIWYG). Twee acties:

- **Sluiten**
- **Printen / opslaan als PDF** — opent de OS-print dialoog. Voor PDF
  kies je "Microsoft Print to PDF" in het printvenster.

De viewer wordt op drie plekken aangeroepen:

1. **Inpakken-stap** in de Orders-tab — verplichte stap tussen IMEI
   scannen en Versturen. Logistiek opent de pakbon, controleert/print, en
   pakt de doos in. Pas dan komt de Versturen-knop beschikbaar.
2. **Verzonden-tab** workspace via "Pakbon openen" voor reeds verzonden
   orders.
3. Als toast-actie direct ná versturen — vangnet voor het geval logistiek
   bij stap 1 niet heeft geprint.

Edge cases (lege units, lege accessoires, ontbrekende velden) crashen
niet maar tonen "—" of slaan de sectie over. Alle dynamische velden
worden HTML-escaped, dus een Zoho-notitie met `<script>` of `&` breekt
het document niet.

**Bedrijfsgegevens** (naam, adres, KvK, BTW, eventueel logo) staan in
[`src/config/company.ts`](./src/config/company.ts) als `COMPANY_INFO`
constant. **Placeholder-waarden — vervang vóór productie.** Geen
runtime-config, geen instellingenscherm; deze waarden worden in de binary
gecompileerd. Een logo activeer je door `src/assets/logo.png` toe te
voegen en het `logoPath` veld in `COMPANY_INFO` te zetten.

## Logistiek-orders zelf maken

Linker zijde van de Orders-tab heeft een **+ Nieuwe order** knop. Form-velden:

- **Ontvanger** (verplicht) — vrije tekst: persoon, team of bedrijf.
- **Verzendadres** (verplicht) — straat + huisnummer, postcode, stad.
- **Producten** — minstens één regel via de productpicker (typen filtert op
  naam of SKU; pijltjes navigeren, Enter selecteert). Per regel: aantal en
  optionele regel-notitie.
- **Interne notitie** (optioneel) — wordt aan de order gehangen als
  `OrderNote` met auteur "Logistiek".

Resultaat: een order met `source: 'logistics'`, ordernummer `LCO-NNNN`,
status `Nieuw`. Voor IMEI-producten worden Units automatisch aangemaakt op
basis van het aantal; voor non-IMEI producten alleen orderpick. Daarna
opent meteen de standaard order-workspace om IMEI's te scannen of direct
te versturen.

> **Zoho-push:** logistiek-orders worden vandaag **niet** naar Zoho
> gestuurd — de live-mode `createOrder` faalt expliciet met een NL-melding.
> Dat is een business-keuze die nog gemaakt moet worden voordat live mode
> aan kan.

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

- Mock services (orders + voorraad) draaien in-memory — een reload reset
  alle voorraadmutaties, ontvangen inkooporders en orderstatus. Opzettelijk
  voor het prototype; de echte backend zal persistent zijn.
- Voorraad heeft nog géén Zoho-tegenhanger — de façade pakt altijd de mock
  inventory service. De order-kant switcht wel automatisch naar Zoho als de
  binary met secrets is gebouwd.
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
