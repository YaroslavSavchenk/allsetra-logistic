import type { InventoryItem, PurchaseOrder } from '@/types/inventory';

/**
 * Realistic seed numbers across the whole product catalogue. Mock dates are
 * kept in 2026-04 so they read consistently next to `mockData.ts`.
 *
 * Single source of mock state - the Zoho swap replaces only this file plus
 * the `MockInventoryService` implementation that consumes it.
 */
export const MOCK_INVENTORY: InventoryItem[] = [
  {
    productId: 'rc-eco5',
    opVoorraad: 42,
    opBestelling: 0,
    lastMovementAt: '2026-04-23T10:15:00',
  },
  {
    productId: 'rc-hcv5-lite',
    opVoorraad: 8,
    opBestelling: 50,
    lastMovementAt: '2026-04-22T14:00:00',
  },
  {
    productId: 'rc-smart5',
    opVoorraad: 17,
    opBestelling: 0,
    lastMovementAt: '2026-04-23T09:30:00',
  },
  {
    productId: 'acc-id-reader',
    opVoorraad: 3,
    opBestelling: 25,
    lastMovementAt: '2026-04-21T16:45:00',
  },
  {
    productId: 'acc-buzzer',
    opVoorraad: 64,
    opBestelling: 0,
    lastMovementAt: '2026-04-20T11:00:00',
  },
  {
    productId: 'acc-power-cable',
    opVoorraad: 38,
    opBestelling: 0,
    lastMovementAt: '2026-04-22T11:30:00',
  },
  {
    productId: 'acc-antenna-ext',
    opVoorraad: 12,
    opBestelling: 30,
    lastMovementAt: '2026-04-19T15:00:00',
  },
  {
    productId: 'acc-mount-bracket',
    opVoorraad: 75,
    opBestelling: 0,
    lastMovementAt: '2026-04-23T09:00:00',
  },
  {
    productId: 'acc-obd-adapter',
    opVoorraad: 4,
    opBestelling: 50,
    lastMovementAt: '2026-04-18T14:20:00',
  },
  {
    productId: 'acc-harness-y',
    opVoorraad: 22,
    opBestelling: 0,
    lastMovementAt: '2026-04-21T10:10:00',
  },
  {
    productId: 'acc-panic-button',
    opVoorraad: 15,
    opBestelling: 0,
    lastMovementAt: '2026-04-22T13:45:00',
  },
  {
    productId: 'acc-relay',
    opVoorraad: 9,
    opBestelling: 0,
    lastMovementAt: '2026-04-23T16:00:00',
  },
  {
    productId: 'bs-bike-lock-pro',
    opVoorraad: 120,
    opBestelling: 0,
    lastMovementAt: '2026-04-24T08:20:00',
  },
  {
    productId: 'bs-helmet-reflector',
    opVoorraad: 410,
    opBestelling: 200,
    lastMovementAt: '2026-04-24T08:22:00',
  },
  {
    productId: 'bs-spoke-lock',
    opVoorraad: 56,
    opBestelling: 0,
    lastMovementAt: '2026-04-22T08:00:00',
  },
  {
    productId: 'bs-alarm',
    opVoorraad: 18,
    opBestelling: 25,
    lastMovementAt: '2026-04-23T12:30:00',
  },
  {
    productId: 'bs-chain-lock',
    opVoorraad: 32,
    opBestelling: 0,
    lastMovementAt: '2026-04-21T17:15:00',
  },
  {
    productId: 'sn-temp-logger',
    opVoorraad: 0,
    opBestelling: 30,
    lastMovementAt: null,
  },
  {
    productId: 'sn-door-contact',
    opVoorraad: 47,
    opBestelling: 0,
    lastMovementAt: '2026-04-20T15:00:00',
  },
  {
    productId: 'sn-motion',
    opVoorraad: 23,
    opBestelling: 0,
    lastMovementAt: '2026-04-21T13:00:00',
  },
  {
    productId: 'sn-fuel-level',
    opVoorraad: 6,
    opBestelling: 20,
    lastMovementAt: '2026-04-19T11:30:00',
  },
  {
    productId: 'sn-humidity',
    opVoorraad: 14,
    opBestelling: 0,
    lastMovementAt: '2026-04-22T16:40:00',
  },
  {
    productId: 'sn-tire-pressure',
    opVoorraad: 2,
    opBestelling: 40,
    lastMovementAt: '2026-04-18T09:50:00',
  },
];

export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po_seed_001',
    createdAt: '2026-04-19T09:00:00',
    note: 'Reguliere bijbestelling Q2',
    status: 'open',
    items: [
      { productId: 'rc-hcv5-lite', qty: 50 },
      { productId: 'acc-id-reader', qty: 25 },
    ],
  },
  {
    id: 'po_seed_002',
    createdAt: '2026-04-21T13:30:00',
    note: 'Voorraadaanvulling fietsbeveiliging',
    status: 'open',
    items: [{ productId: 'bs-helmet-reflector', qty: 200 }],
  },
  {
    id: 'po_seed_003',
    createdAt: '2026-04-22T15:10:00',
    note: 'Eerste batch sensoren',
    status: 'open',
    items: [{ productId: 'sn-temp-logger', qty: 30 }],
  },
  {
    id: 'po_seed_004',
    createdAt: '2026-04-20T11:45:00',
    note: 'Aanvulling installer-accessoires',
    status: 'open',
    items: [
      { productId: 'acc-obd-adapter', qty: 50 },
      { productId: 'acc-antenna-ext', qty: 30 },
    ],
  },
  {
    id: 'po_seed_005',
    createdAt: '2026-04-22T09:30:00',
    note: 'Sensorik kwartaalbestelling',
    status: 'open',
    items: [
      { productId: 'sn-fuel-level', qty: 20 },
      { productId: 'sn-tire-pressure', qty: 40 },
    ],
  },
  {
    id: 'po_seed_006',
    createdAt: '2026-04-23T14:00:00',
    note: 'Anti-diefstal alarm restock',
    status: 'open',
    items: [{ productId: 'bs-alarm', qty: 25 }],
  },
];
