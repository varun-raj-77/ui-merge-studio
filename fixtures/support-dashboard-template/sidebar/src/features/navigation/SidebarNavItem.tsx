interface Props { label: string; icon: string; active?: boolean; collapsed: boolean; badge?: number }
export function SidebarNavItem({ label, icon, active, collapsed, badge }: Props) { return <a aria-label={collapsed ? label : undefined} title={collapsed ? label : undefined} className={active ? 'nav-item active' : 'nav-item'} href="/tickets"><span aria-hidden="true" className="nav-icon">{icon}</span>{!collapsed && <span>{label}</span>}{badge !== undefined && <span className="badge" aria-label={`${badge} open tickets`}>{badge}</span>}</a>; }

