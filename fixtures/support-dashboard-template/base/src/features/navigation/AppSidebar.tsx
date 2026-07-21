import { SidebarNavItem } from './SidebarNavItem';
export function AppSidebar() { return <aside className="sidebar"><div className="brand">Beacon Ops</div><nav aria-label="Primary"><SidebarNavItem label="Tickets" active /><SidebarNavItem label="Customers" /><SidebarNavItem label="Reports" /></nav></aside>; }

