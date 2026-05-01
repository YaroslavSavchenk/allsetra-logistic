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
    source: 'zoho',
    notes: [],
    orderpick: [
      { productId: 'rc-hcv5-lite', quantity: 4, note: '' },
      { productId: 'acc-id-reader', quantity: 4, note: '' },
    ],
    units: [
      { id: 'u1', imei: '', productId: 'rc-hcv5-lite' },
      { id: 'u2', imei: '', productId: 'rc-hcv5-lite' },
      { id: 'u3', imei: '', productId: 'rc-hcv5-lite' },
      { id: 'u4', imei: '', productId: 'rc-hcv5-lite' },
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
    source: 'zoho',
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
    orderpick: [{ productId: 'rc-eco5', quantity: 1, note: '' }],
    units: [{ id: 'u1', imei: '', productId: 'rc-eco5' }],
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
    source: 'zoho',
    notes: [],
    orderpick: [
      { productId: 'rc-smart5', quantity: 2, note: '' },
      { productId: 'rc-hcv5-lite', quantity: 3, note: '' },
      { productId: 'acc-id-reader', quantity: 5, note: '' },
      { productId: 'acc-buzzer', quantity: 2, note: 'Luide variant' },
    ],
    units: [
      { id: 'u1', imei: '', productId: 'rc-smart5' },
      { id: 'u2', imei: '', productId: 'rc-smart5' },
      { id: 'u3', imei: '', productId: 'rc-hcv5-lite' },
      { id: 'u4', imei: '', productId: 'rc-hcv5-lite' },
      { id: 'u5', imei: '', productId: 'rc-hcv5-lite' },
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
    source: 'zoho',
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
        productId: 'rc-smart5',
        quantity: 3,
        note: 'Custom APN vereist',
      },
    ],
    units: [
      { id: 'u1', imei: '', productId: 'rc-smart5' },
      { id: 'u2', imei: '', productId: 'rc-smart5' },
      { id: 'u3', imei: '', productId: 'rc-smart5' },
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
    source: 'zoho',
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
      { productId: 'rc-eco5', quantity: 3, note: '' },
      { productId: 'acc-id-reader', quantity: 3, note: '' },
    ],
    units: [
      { id: 'u1', imei: '861234567890123', productId: 'rc-eco5' },
      { id: 'u2', imei: '863712345678901', productId: 'rc-eco5' },
      { id: 'u3', imei: '', productId: 'rc-eco5' },
    ],
  },
  // Non-RouteConnect family — IMEI-loze producten doorlopen de orderpick
  // zonder Units en worden bij verzending alleen op aantal afgeschreven.
  {
    id: 'zcrm_006',
    orderNumber: 'RCO-0047',
    account: 'Stadsfietsverhuur Amsterdam',
    address: 'Damrak 22',
    postcode: '1012 LJ',
    city: 'Amsterdam',
    status: 'Nieuw',
    createdAt: '2026-04-24T10:30:00',
    quoteOwner: 'Sanne Visser',
    source: 'zoho',
    notes: [
      {
        id: 'n_sva_1',
        author: 'Sanne Visser',
        content:
          'Verhuurseizoen begint volgende week — graag deze week nog versturen.',
        createdAt: '2026-04-24T10:32:00',
        modifiedAt: null,
      },
    ],
    orderpick: [
      { productId: 'bs-bike-lock-pro', quantity: 10, note: '' },
      { productId: 'bs-helmet-reflector', quantity: 25, note: '' },
    ],
    units: [],
  },
];
