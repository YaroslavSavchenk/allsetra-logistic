import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { USERS, type UserProfile, type UserRole } from '@/config/users';

/**
 * Active-profile context. The provider keeps a single `currentUser` in
 * state and persists the chosen profile id in localStorage so a reload
 * lands the user on the same profile they last picked.
 *
 * `currentUser` is `null` exactly when no profile has been picked yet
 * (or the persisted id no longer maps to a known USERS entry). The app
 * shell uses this null-state to render the first-run profile picker.
 *
 * NOTE: This is not authentication. It's identity tagging - the OS
 * already authenticated the user. We could just as well call this
 * "active operator". The role enables UI gating; nothing more.
 */

const STORAGE_KEY = 'logistiek.currentUserId';

interface CurrentUserContextValue {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile) => void;
  /** Clears the persisted id; the picker re-appears next render. */
  clearCurrentUser: () => void;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

function readStoredUser(): UserProfile | null {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    if (!id) return null;
    return USERS.find((u) => u.id === id) ?? null;
  } catch {
    return null;
  }
}

interface ProviderProps {
  children: ReactNode;
}

export function CurrentUserProvider({ children }: ProviderProps) {
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(() =>
    readStoredUser(),
  );

  // Keep localStorage in sync. Wrapping localStorage reads/writes in
  // try/catch lets the app still function in private/sandboxed contexts
  // where localStorage throws - the picker just reappears every reload.
  const setCurrentUser = useCallback((user: UserProfile) => {
    try {
      localStorage.setItem(STORAGE_KEY, user.id);
    } catch {
      // ignore - non-fatal
    }
    setCurrentUserState(user);
  }, []);

  const clearCurrentUser = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore - non-fatal
    }
    setCurrentUserState(null);
  }, []);

  // Defensive: if the USERS list is edited (entry renamed/removed) and the
  // persisted id no longer resolves, drop the stale id rather than holding
  // a phantom profile reference. Runs once on mount.
  useEffect(() => {
    if (currentUser) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && !USERS.find((u) => u.id === stored)) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  const value = useMemo<CurrentUserContextValue>(
    () => ({ currentUser, setCurrentUser, clearCurrentUser }),
    [currentUser, setCurrentUser, clearCurrentUser],
  );

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

/**
 * Returns the active user. **Must** be called from inside the protected
 * app shell - i.e. anywhere downstream of the picker gate. Outside the
 * gate, the user is `null` and components shouldn't be reaching for it.
 */
export function useCurrentUser(): UserProfile {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error(
      'useCurrentUser must be used inside a CurrentUserProvider',
    );
  }
  if (!ctx.currentUser) {
    throw new Error(
      'useCurrentUser called before a profile was picked - render <ProfilePicker /> first',
    );
  }
  return ctx.currentUser;
}

/**
 * Variant that returns `null` when no profile is picked. Used by the App
 * shell to decide between the picker and the main UI.
 */
export function useCurrentUserOrNull(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error(
      'useCurrentUserOrNull must be used inside a CurrentUserProvider',
    );
  }
  return ctx;
}

/**
 * Convenience: does the current user hold the given role? Beheer is treated
 * as a superset (it has every logistiek-permission) so a single
 * `useHasRole('logistiek')` call doesn't lock beheer out of the daily flow.
 */
export function useHasRole(role: UserRole): boolean {
  const ctx = useContext(CurrentUserContext);
  if (!ctx || !ctx.currentUser) return false;
  if (ctx.currentUser.role === 'beheer') return true;
  return ctx.currentUser.role === role;
}
