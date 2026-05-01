import { validateImei, IMEI_LENGTH } from '../src/lib/imei';
import { detectProductFromImei } from '../src/lib/productStrategy';

type Case = {
  name: string;
  imei: string;
  expectedProductId: string;
  otherImeis?: string[];
  expect: 'valid' | 'invalid' | 'empty';
  expectDetectedProductId?: string;
  expectReasonIncludes?: string;
};

const cases: Case[] = [
  { name: 'empty is empty', imei: '', expectedProductId: 'rc-eco5', expect: 'empty' },
  {
    name: 'short imei → length error',
    imei: '12345',
    expectedProductId: 'rc-eco5',
    expect: 'invalid',
    expectReasonIncludes: 'cijfers',
  },
  {
    name: 'non-digit → invalid (but sanitize layer strips, so bare validate trips format rule)',
    imei: '861-23456789012',
    expectedProductId: 'rc-eco5',
    expect: 'invalid',
    expectReasonIncludes: 'Alleen cijfers',
  },
  {
    name: '15 digits unknown prefix',
    imei: '999123456789012',
    expectedProductId: 'rc-smart5',
    expect: 'invalid',
    expectReasonIncludes: 'Onbekende',
  },
  {
    name: '864… Smart5 valid for expected Smart5',
    imei: '864123456789012',
    expectedProductId: 'rc-smart5',
    expect: 'valid',
    expectDetectedProductId: 'rc-smart5',
  },
  {
    name: '861… Eco5 but expected Smart5 → type mismatch',
    imei: '861123456789012',
    expectedProductId: 'rc-smart5',
    expect: 'invalid',
    expectReasonIncludes: 'Verwacht RouteConnect Smart5, is RouteConnect Eco5',
  },
  {
    name: '8637… Eco5 (longer prefix match)',
    imei: '863712345678901',
    expectedProductId: 'rc-eco5',
    expect: 'valid',
    expectDetectedProductId: 'rc-eco5',
  },
  {
    name: '8635… HCV5-Lite (longer prefix match)',
    imei: '863512345678901',
    expectedProductId: 'rc-hcv5-lite',
    expect: 'valid',
    expectDetectedProductId: 'rc-hcv5-lite',
  },
  {
    name: '8635… for Eco5 → type mismatch',
    imei: '863512345678901',
    expectedProductId: 'rc-eco5',
    expect: 'invalid',
    expectReasonIncludes: 'HCV5-Lite',
  },
  {
    name: 'duplicate within order',
    imei: '864123456789012',
    expectedProductId: 'rc-smart5',
    otherImeis: ['864123456789012'],
    expect: 'invalid',
    expectReasonIncludes: 'al ingevuld',
  },
  {
    name: 'empty otherImeis ignored in duplicate check',
    imei: '864123456789012',
    expectedProductId: 'rc-smart5',
    otherImeis: ['', ' '],
    expect: 'valid',
    expectDetectedProductId: 'rc-smart5',
  },
];

let failed = 0;
for (const c of cases) {
  const res = validateImei(c.imei, {
    expectedProductId: c.expectedProductId,
    otherImeis: c.otherImeis ?? [],
  });
  const ok =
    res.state === c.expect &&
    (c.expect !== 'valid' ||
      (res.state === 'valid' && res.detectedProductId === c.expectDetectedProductId)) &&
    (c.expect !== 'invalid' ||
      !c.expectReasonIncludes ||
      (res.state === 'invalid' && res.reason.includes(c.expectReasonIncludes)));

  if (ok) {
    console.log(`  PASS  ${c.name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${c.name}`);
    console.log(`        expected=${c.expect}${c.expectDetectedProductId ? ` (${c.expectDetectedProductId})` : ''}${c.expectReasonIncludes ? ` reason~"${c.expectReasonIncludes}"` : ''}`);
    console.log(`        got=${JSON.stringify(res)}`);
  }
}

// Spot check detectProductFromImei directly
const prefixCases: Array<[string, string | null]> = [
  ['861', 'rc-eco5'],
  ['8637', 'rc-eco5'],
  ['8635', 'rc-hcv5-lite'],
  ['864', 'rc-smart5'],
  ['123', null],
  ['', null],
];
for (const [prefix, expected] of prefixCases) {
  const got = detectProductFromImei(prefix);
  if (got !== expected) {
    failed++;
    console.log(`  FAIL  detectProductFromImei("${prefix}") expected=${expected} got=${got}`);
  } else {
    console.log(`  PASS  detectProductFromImei("${prefix}") = ${expected}`);
  }
}

console.log(`\nIMEI_LENGTH constant = ${IMEI_LENGTH}`);

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
} else {
  console.log('\nAll tests passed');
}
