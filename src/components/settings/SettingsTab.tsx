import { Settings as SettingsIcon } from 'lucide-react';
import { ThemeSection } from './ThemeSection';
import { ProfileSection } from './ProfileSection';
import { AccountsSection } from './AccountsSection';
import { AppInfoSection } from './AppInfoSection';

/**
 * Settings tab. Single column, scrollable, no sidebar.
 *
 * Per CLAUDE.md the app is intentionally configuration-light: no API keys,
 * no first-run wizards. This tab only surfaces preferences (theme),
 * identity (active profile + accounts list), and read-only info (version,
 * data source). Adding a real config knob means a deliberate departure
 * from the "no first-run configuration" rule and should be checked
 * against that doc.
 */
export function SettingsTab() {
  return (
    <div className="scroll-thin flex h-full flex-col overflow-y-auto bg-surface-900">
      <header className="border-b border-surface-700 bg-surface-850/60 px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">
              Instellingen
            </h1>
            <p className="text-xs text-slate-400">
              Voorkeuren, profiel en app-informatie.
            </p>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-8 py-6">
        <ThemeSection />
        <ProfileSection />
        <AccountsSection />
        <AppInfoSection />
      </div>
    </div>
  );
}
