interface Props { label: string; active?: boolean }
export function SidebarNavItem({ label, active }: Props) { return <a className={active ? 'nav-item active' : 'nav-item'} href="/tickets">{label}</a>; }

