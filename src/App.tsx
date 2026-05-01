import { useState } from 'react';
import { Boxes, ListChecks } from 'lucide-react';
import { TopNav, type TabDefinition } from '@/components/TopNav';
import { OrdersTab } from '@/components/orders/OrdersTab';
import { InventoryTab } from '@/components/inventory/InventoryTab';
import { UpdatePrompt } from '@/components/UpdatePrompt';

type TabId = 'orders' | 'inventory';

const TABS: ReadonlyArray<TabDefinition<TabId>> = [
  { id: 'orders', label: 'Orders', icon: ListChecks },
  { id: 'inventory', label: 'Voorraad', icon: Boxes },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('orders');

  return (
    <div className="flex h-full w-full flex-col bg-surface-950 text-slate-100">
      <TopNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-hidden">
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'inventory' && <InventoryTab />}
      </div>
      <UpdatePrompt />
    </div>
  );
}
