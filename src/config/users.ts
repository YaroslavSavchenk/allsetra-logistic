/**
 * Profielen + rollen. Niet hetzelfde als authenticatie — de Windows-login
 * regelt dat al, en de installer is intern. Profielen labelen wie er aan
 * de bak zit, zodat de app:
 *   1. destructieve acties (voorraad aanpassen, inkooporders verwijderen)
 *      kan beperken tot beheer-rollen, en
 *   2. eventueel later mutaties kan toeschrijven aan een naam in de
 *      audit-trail.
 *
 * Bewerken van deze lijst is **bewust** een code-change: er is geen UI
 * voor het aanmaken van profielen. Wie erbij komt, voegt een entry toe in
 * deze file en publiceert een nieuwe release.
 */

export type UserRole = 'logistiek' | 'beheer';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
}

/**
 * Voorgedefinieerde profielen. Voeg er één toe per actief team-lid; de
 * `id` mag elke stabiele string zijn maar moet uniek zijn binnen deze lijst.
 */
export const USERS: UserProfile[] = [
  { id: 'logistiek-1', name: 'Logistiek medewerker', role: 'logistiek' },
  { id: 'beheer-1', name: 'Beheerder', role: 'beheer' },
];

/** Nederlandse labels voor de role-badge in de UI. */
export const ROLE_LABEL: Record<UserRole, string> = {
  logistiek: 'Logistiek',
  beheer: 'Beheer',
};
