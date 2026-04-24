import type { DeviceType } from '@/types/order';

export const IMEI_LENGTH = 15;

export function detectDeviceType(imei: string): DeviceType | null {
  if (!/^\d+$/.test(imei)) return null;

  // Longest prefixes first so 8637/8635 match before 861/864.
  if (imei.startsWith('8637')) return 'Eco5';
  if (imei.startsWith('8635')) return 'HCV5-Lite';
  if (imei.startsWith('861')) return 'Eco5';
  if (imei.startsWith('864')) return 'Smart5';
  return null;
}

export type ImeiValidation =
  | { state: 'empty' }
  | { state: 'invalid'; reason: string }
  | { state: 'valid'; detectedType: DeviceType };

export interface ValidationContext {
  expectedType: DeviceType;
  otherImeis: string[];
}

export function validateImei(
  raw: string,
  ctx: ValidationContext,
): ImeiValidation {
  const imei = raw.trim();

  if (imei.length === 0) return { state: 'empty' };

  if (/[^\d]/.test(imei)) {
    return { state: 'invalid', reason: 'Alleen cijfers toegestaan' };
  }

  if (imei.length !== IMEI_LENGTH) {
    return {
      state: 'invalid',
      reason: `IMEI moet ${IMEI_LENGTH} cijfers zijn (nu ${imei.length})`,
    };
  }

  const detectedType = detectDeviceType(imei);
  if (!detectedType) {
    return {
      state: 'invalid',
      reason: 'Onbekende IMEI prefix — geen RouteConnect device',
    };
  }

  if (detectedType !== ctx.expectedType) {
    return {
      state: 'invalid',
      reason: `Verwacht ${ctx.expectedType}, is ${detectedType}`,
    };
  }

  if (ctx.otherImeis.some((other) => other.trim() === imei)) {
    return {
      state: 'invalid',
      reason: 'Deze IMEI is al ingevuld bij een andere unit',
    };
  }

  return { state: 'valid', detectedType };
}

export function isImeiComplete(validation: ImeiValidation): boolean {
  return validation.state === 'valid';
}
