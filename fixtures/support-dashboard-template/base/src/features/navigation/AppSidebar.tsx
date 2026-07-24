import { SidebarNavItem } from './SidebarNavItem';
export function AppSidebar() { return <aside className="sidebar"><div className="brand">Sample Support Desk</div><div className="demo-context">Demo application · Fake ticket data</div><nav aria-label="Primary"><SidebarNavItem label="Tickets" active /><SidebarNavItem label="Customers" /><SidebarNavItem label="Reports" /></nav></aside>; }
