import { useState } from 'react';
import { sidebarStorageKey } from '../types/navigation';
function readCollapsed() { try { const value = localStorage.getItem(sidebarStorageKey); return value === 'true' ? true : value === 'false' ? false : false; } catch { return false; } }
export function useSidebarState() { const [collapsed, setCollapsed] = useState(readCollapsed); const toggle = () => setCollapsed(value => { const next = !value; try { localStorage.setItem(sidebarStorageKey, String(next)); } catch { /* storage can be unavailable */ } return next; }); return { collapsed, toggle }; }

