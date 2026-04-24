import {
  detectDeviceType,
  validateImei,
  IMEI_LENGTH,
} from '../src/lib/imei';
import type { DeviceType } from '../src/types/order';

type Case = {
  name: string;
  imei: string;
  expectedType: DeviceType;
  otherImeis?: string[];
  expect: 'valid' | 'invalid' | 'empty';
  expectDetected?: DeviceType;
  expectReasonIncludes?: string;
};

const cases: Case[] = [
  { name: 'empty is empty', imei: '', expectedType: 'Eco5', expect: 'empty' },
  {
    name: 'short imei → length error',
    imei: '12345',
    expectedType: 'Eco5',
    expect: 'invalid',
    expectReasonIncludes: 'cijfers',
  },
  {
    name: 'non-digit → invalid (but sanitize layer strips, so bare validate trips format rule)',
    imei: '861-23456789012',
    expectedType: 'Eco5',
    expect: 'invalid',
    expectReasonIncludes: 'Alleen cijfers',
  },
  {
    name: '15 digits unknown prefix',
    imei: '999123456789012',
    expectedType: 'Smart5',
    expect: 'invalid',
    expectReasonIncludes: 'Onbekende',
  },
  {
    name: '864… Smart5 valid for expected Smart5',
    imei: '864123456789012',
    expectedType: 'Smart5',
    expect: 'valid',
    expectDetected: 'Smart5',
  },
  {
    name: '861… Eco5 but expected Smart5 → type mismatch',
    imei: '861123456789012',
    expectedType: 'Smart5',
    expect: 'invalid',
    expectReasonIncludes: 'Verwacht Smart5, is Eco5',
  },
  {
    name: '8637… Eco5 (longer prefix match)',
    imei: '863712345678901',
    expectedType: 'Eco5',
    expect: 'valid',
    expectDetected: 'Eco5',
  },
  {
    name: '8635… HCV5-Lite (longer prefix match)',
    imei: '863512345678901',
    expectedType: 'HCV5-Lite',
    expect: 'valid',
    expectDetected: 'HCV5-Lite',
  },
  {
    name: '8635… for Eco5 → type mismatch',
    imei: '863512345678901',
    expectedType: 'Eco5',
    expect: 'invalid',
    expectReasonIncludes: 'HCV5-Lite',
  },
  {
    name: 'duplicate within order',
    imei: '864123456789012',
    expectedType: 'Smart5',
    otherImeis: ['864123456789012'],
    expect: 'invalid',
    expectReasonIncludes: 'al ingevuld',
  },
  {
    name: 'empty otherImeis ignored in duplicate check',
    imei: '864123456789012',
    expectedType: 'Smart5',
    otherImeis: ['', ' '],
    expect: 'valid',
    expectDetected: 'Smart5',
  },
];

let failed = 0;
for (const c of cases) {
  const res = validateImei(c.imei, {
    expectedType: c.expectedType,
    otherImeis: c.otherImeis ?? [],
  });
  const ok =
    res.state === c.expect &&
    (c.expect !== 'valid' || res.state === 'valid' && res.detectedType === c.expectDetected) &&
    (c.expect !== 'invalid' ||
      !c.expectReasonIncludes ||
      (res.state === 'invalid' && res.reason.includes(c.expectReasonIncludes)));

  if (ok) {
    console.log(`  PASS  ${c.name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${c.name}`);
    console.log(`        expected=${c.expect}${c.expectDetected ? ` (${c.expectDetected})` : ''}${c.expectReasonIncludes ? ` reason~"${c.expectReasonIncludes}"` : ''}`);
    console.log(`        got=${JSON.stringify(res)}`);
  }
}

// Spot check detectDeviceType directly
const prefixCases: Array<[string, DeviceType | null]> = [
  ['861', 'Eco5'],
  ['8637', 'Eco5'],
  ['8635', 'HCV5-Lite'],
  ['864', 'Smart5'],
  ['123', null],
  ['', null],
];
for (const [prefix, expected] of prefixCases) {
  const got = detectDeviceType(prefix);
  if (got !== expected) {
    failed++;
    console.log(`  FAIL  detectDeviceType("${prefix}") expected=${expected} got=${got}`);
  } else {
    console.log(`  PASS  detectDeviceType("${prefix}") = ${expected}`);
  }
}

console.log(`\nIMEI_LENGTH constant = ${IMEI_LENGTH}`);

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
} else {
  console.log('\nAll tests passed');
}
