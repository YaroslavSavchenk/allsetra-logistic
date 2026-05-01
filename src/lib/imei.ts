import { detectProductFromImei, getProduct } from './productStrategy';

export const IMEI_LENGTH = 15;

export type ImeiValidation =
  | { state: 'empty' }
  | { state: 'invalid'; reason: string }
  | { state: 'valid'; detectedProductId: string };

export interface ValidationContext {
  expectedProductId: string;
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

  const detectedProductId = detectProductFromImei(imei);
  if (!detectedProductId) {
    return {
      state: 'invalid',
      reason: 'Onbekende IMEI prefix — geen herkend product',
    };
  }

  if (detectedProductId !== ctx.expectedProductId) {
    const expectedName = getProduct(ctx.expectedProductId)?.name ?? ctx.expectedProductId;
    const detectedName = getProduct(detectedProductId)?.name ?? detectedProductId;
    return {
      state: 'invalid',
      reason: `Verwacht ${expectedName}, is ${detectedName}`,
    };
  }

  if (ctx.otherImeis.some((other) => other.trim() === imei)) {
    return {
      state: 'invalid',
      reason: 'Deze IMEI is al ingevuld bij een andere unit',
    };
  }

  return { state: 'valid', detectedProductId };
}

export function isImeiComplete(validation: ImeiValidation): boolean {
  return validation.state === 'valid';
}
