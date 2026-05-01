import { useState } from 'react';
import { Boxes, ListChecks, PackageCheck, Settings } from 'lucide-react';
import { TopNav, type TabDefinition } from '@/components/TopNav';
import { OrdersTab } from '@/components/orders/OrdersTab';
import { InventoryTab } from '@/components/inventory/InventoryTab';
import { ShippedTab } from '@/components/shipped/ShippedTab';
import { SettingsTab } from '@/components/settings/SettingsTab';
import { ProfilePicker } from '@/components/settings/ProfilePicker';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { useCurrentUserOrNull } from '@/contexts/CurrentUserContext';

type TabId = 'orders' | 'shipped' | 'inventory' | 'settings';

const TABS: ReadonlyArray<TabDefinition<TabId>> = [
  { id: 'orders', label: 'Orders', icon: ListChecks },
  { id: 'shipped', label: 'Verzonden', icon: PackageCheck },
  { id: 'inventory', label: 'Voorraad', icon: Boxes },
  { id: 'settings', label: 'Instellingen', icon: Settings },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('orders');
  const { currentUser } = useCurrentUserOrNull();

  // Gate the entire app shell behind a profile pick. The picker is rendered
  // full-screen (no TopNav, no tabs) so there is nothing to interact with
  // until logistics has identified themselves. The OS already authenticated
  // the user — this is identity tagging, not auth.
  if (!currentUser) {
    return (
      <div className="flex h-full w-full flex-col bg-surface-950 text-slate-100">
        <ProfilePicker />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-surface-950 text-slate-100">
      <TopNav
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onUserBadgeClick={() => setActiveTab('settings')}
      />
      <div className="flex-1 overflow-hidden">
        {/*
          Tabs are kept always-mounted and toggled via `display: none` so each
          tab's local state (selected order/product, search text, in-progress
          form input) survives a tab switch. Inactive tabs stop rendering UI
          but their React tree, component state, and React Query cache stay
          intact. Mount-time auto-select effects fire once on first load and
          are idempotent on subsequent shows/hides.
        */}
        <div className={activeTab === 'orders' ? 'h-full' : 'hidden'}>
          <OrdersTab />
        </div>
        <div className={activeTab === 'shipped' ? 'h-full' : 'hidden'}>
          <ShippedTab />
        </div>
        <div className={activeTab === 'inventory' ? 'h-full' : 'hidden'}>
          <InventoryTab />
        </div>
        <div className={activeTab === 'settings' ? 'h-full' : 'hidden'}>
          <SettingsTab />
        </div>
      </div>
      <UpdatePrompt />
    </div>
  );
}
