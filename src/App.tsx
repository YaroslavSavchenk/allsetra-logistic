import { useState } from 'react';
import { Boxes, ListChecks, PackageCheck } from 'lucide-react';
import { TopNav, type TabDefinition } from '@/components/TopNav';
import { OrdersTab } from '@/components/orders/OrdersTab';
import { InventoryTab } from '@/components/inventory/InventoryTab';
import { ShippedTab } from '@/components/shipped/ShippedTab';
import { UpdatePrompt } from '@/components/UpdatePrompt';

type TabId = 'orders' | 'shipped' | 'inventory';

const TABS: ReadonlyArray<TabDefinition<TabId>> = [
  { id: 'orders', label: 'Orders', icon: ListChecks },
  { id: 'shipped', label: 'Verzonden', icon: PackageCheck },
  { id: 'inventory', label: 'Voorraad', icon: Boxes },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('orders');

  return (
    <div className="flex h-full w-full flex-col bg-surface-950 text-slate-100">
      <TopNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
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
      </div>
      <UpdatePrompt />
    </div>
  );
}
