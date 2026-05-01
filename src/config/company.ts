/**
 * Placeholder bedrijfsgegevens — vervang vóór productie. Compiled into the
 * binary; geen runtime-config.
 *
 * The pakbon (waybill) template reads these values verbatim. Update before
 * shipping the first real installer — there is no UI to change them.
 *
 * `logoPath` is intentionally omitted in the placeholder. When ready, drop
 * `logo.png` in `src/assets/` and set `logoPath: '/logo.png'` (or a public
 * asset URL). The template renders a text fallback when no logo is set.
 */

export interface CompanyInfo {
  name: string;
  addressLine1: string;
  addressLine2: string; // postcode + city
  kvk: string;
  btw: string;
  logoPath?: string; // path to PNG asset, optional
  phone?: string;
  email?: string;
  website?: string;
}

export const COMPANY_INFO: CompanyInfo = {
  name: 'Allsetra B.V.',
  addressLine1: 'Eekhorstweg 14',
  addressLine2: '8331 LJ Steenwijk',
  kvk: 'KvK 12345678',
  btw: 'BTW NL000000000B01',
  phone: '+31 (0)521 530 100',
  email: 'logistiek@allsetra.nl',
  website: 'allsetra.nl',
};
