import type { Order } from '@/types/order';

export const MOCK_ORDERS: Order[] = [
  {
    id: 'zcrm_001',
    orderNumber: 'RCO-0042',
    account: 'Transportbedrijf De Vries B.V.',
    address: 'Industrieweg 142',
    postcode: '3542 AD',
    city: 'Utrecht',
    status: 'Nieuw',
    createdAt: '2026-04-22T09:15:00',
    quoteOwner: 'Marieke Jansen',
    notes: [],
    orderpick: [
      { product: 'RouteConnect HCV5-Lite', quantity: 4, note: '' },
      { product: 'ID Reader', quantity: 4, note: '' },
    ],
    units: [
      { id: 'u1', imei: '', type: 'HCV5-Lite' },
      { id: 'u2', imei: '', type: 'HCV5-Lite' },
      { id: 'u3', imei: '', type: 'HCV5-Lite' },
      { id: 'u4', imei: '', type: 'HCV5-Lite' },
    ],
  },
  {
    id: 'zcrm_002',
    orderNumber: 'RCO-0043',
    account: 'Koeriersdienst Snelweg Noord',
    address: 'Havenstraat 8',
    postcode: '9723 BR',
    city: 'Groningen',
    status: 'Nieuw',
    createdAt: '2026-04-22T14:42:00',
    quoteOwner: 'Pieter Bakker',
    notes: [
      {
        id: 'n_snn_1',
        author: 'Pieter Bakker',
        content:
          'Klant belt donderdag voor bevestiging verzenddatum — nummer staat in Zoho.',
        createdAt: '2026-04-22T15:10:00',
        modifiedAt: null,
      },
    ],
    orderpick: [{ product: 'RouteConnect Eco5', quantity: 1, note: '' }],
    units: [{ id: 'u1', imei: '', type: 'Eco5' }],
  },
  {
    id: 'zcrm_003',
    orderNumber: 'RCO-0044',
    account: 'Logistiek Centrum Eindhoven',
    address: 'De Run 4220',
    postcode: '5503 LN',
    city: 'Veldhoven',
    status: 'Nieuw',
    createdAt: '2026-04-23T08:05:00',
    quoteOwner: 'Sanne Visser',
    notes: [],
    orderpick: [
      { product: 'RouteConnect Smart5', quantity: 2, note: '' },
      { product: 'RouteConnect HCV5-Lite', quantity: 3, note: '' },
      { product: 'ID Reader', quantity: 5, note: '' },
      { product: 'Buzzer', quantity: 2, note: 'Luide variant' },
    ],
    units: [
      { id: 'u1', imei: '', type: 'Smart5' },
      { id: 'u2', imei: '', type: 'Smart5' },
      { id: 'u3', imei: '', type: 'HCV5-Lite' },
      { id: 'u4', imei: '', type: 'HCV5-Lite' },
      { id: 'u5', imei: '', type: 'HCV5-Lite' },
    ],
  },
  {
    id: 'zcrm_004',
    orderNumber: 'RCO-0045',
    account: 'Bouwbedrijf Vermeer & Zonen',
    address: 'Stationsweg 17',
    postcode: '7607 GX',
    city: 'Almelo',
    status: 'Nieuw',
    createdAt: '2026-04-23T11:28:00',
    quoteOwner: 'Marieke Jansen',
    notes: [
      {
        id: 'n_vrm_1',
        author: 'Marieke Jansen',
        content:
          'Custom APN instelling vereist: "vermeer-fleet.mnc001.mcc204.gprs". Dit MOET vooraf op de devices gezet worden. Contact tech support bij twijfel.',
        createdAt: '2026-04-23T11:30:00',
        modifiedAt: null,
      },
      {
        id: 'n_vrm_2',
        author: 'Ruud (tech)',
        content:
          'APN via factory tool gezet op devices met serienummers SN-4401..4403. Dubbelcheck met log voor verzenden.',
        createdAt: '2026-04-23T14:02:00',
        modifiedAt: '2026-04-23T14:05:00',
      },
    ],
    orderpick: [
      {
        product: 'RouteConnect Smart5',
        quantity: 3,
        note: 'Custom APN vereist',
      },
    ],
    units: [
      { id: 'u1', imei: '', type: 'Smart5' },
      { id: 'u2', imei: '', type: 'Smart5' },
      { id: 'u3', imei: '', type: 'Smart5' },
    ],
  },
  {
    id: 'zcrm_005',
    orderNumber: 'RCO-0046',
    account: 'Taxi Maastricht Centraal',
    address:
      'Installatiebedrijf Heuvelland — Limburgstraat 88 (afwijkend verzendadres)',
    postcode: '6211 LK',
    city: 'Maastricht',
    status: 'In behandeling',
    createdAt: '2026-04-23T15:50:00',
    quoteOwner: 'Pieter Bakker',
    notes: [
      {
        id: 'n_tmc_1',
        author: 'Pieter Bakker',
        content:
          'Verzenden naar installatiebedrijf Heuvelland, NIET naar klant. Factuur wel naar Taxi Maastricht Centraal.',
        createdAt: '2026-04-23T15:55:00',
        modifiedAt: null,
      },
    ],
    orderpick: [
      { product: 'RouteConnect Eco5', quantity: 3, note: '' },
      { product: 'ID Reader', quantity: 3, note: '' },
    ],
    units: [
      { id: 'u1', imei: '861234567890123', type: 'Eco5' },
      { id: 'u2', imei: '863712345678901', type: 'Eco5' },
      { id: 'u3', imei: '', type: 'Eco5' },
    ],
  },
];
