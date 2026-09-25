'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronDown, ChevronLeft, CircleHelp, LayoutDashboard, LogOut, Menu, Search, Settings, ShoppingBag, Store, X } from 'lucide-react';

type NavItem = { label: string; icon: React.ReactNode };
type DashboardShellProps = { role: 'vendor' | 'admin'; title: string; subtitle: string; children: React.ReactNode; nav: NavItem[] };

export function DashboardShell({ role, title, subtitle, children, nav }: DashboardShellProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(nav[0]?.label || 'Overview');
  return <div className="dashboard-app">
    <aside className={`dashboard-sidebar ${open ? 'open' : ''}`}><div className="dashboard-brand"><Link className="brand" href="/"><span className="brand-mark"><span /><span /><span /><span /></span><span>bazzaro</span></Link><button onClick={() => setOpen(false)}><X size={18} /></button></div><div className="dashboard-role"><span className="dashboard-role-icon">{role === 'admin' ? 'A' : 'S'}</span><div><strong>{role === 'admin' ? 'Bazzaro admin' : 'Sajilo Goods'}</strong><small>{role === 'admin' ? 'Operations workspace' : 'Verified seller'}</small></div><ChevronDown size={14} /></div><nav className="dashboard-nav"><span className="dashboard-nav-label">Workspace</span>{nav.map((item) => <button key={item.label} className={active === item.label ? 'active' : ''} onClick={() => { setActive(item.label); setOpen(false); }}><span>{item.icon}</span>{item.label}{item.label === 'Orders' && <i>8</i>}</button>)}</nav><div className="dashboard-bottom-nav"><button><CircleHelp size={16} /> Help centre</button><button><Settings size={16} /> Settings</button><Link href="/"><ChevronLeft size={16} /> Back to store</Link></div></aside><div className="dashboard-main"><header className="dashboard-header"><div className="dashboard-header-left"><button className="dashboard-menu" onClick={() => setOpen(true)}><Menu size={20} /></button><div className="breadcrumb"><Link href="/">Bazzaro</Link><ChevronLeft size={13} /><strong>{title}</strong></div></div><div className="dashboard-header-actions"><label className="dashboard-search"><Search size={16} /><input placeholder="Search workspace" /></label><button className="dashboard-icon-button"><Bell size={18} /><i /></button><span className="dashboard-header-avatar">SG</span></div></header><div className="dashboard-content"><div className="dashboard-title-row"><div><span className="dashboard-kicker">{role === 'admin' ? 'Monday, 25 September 2025' : 'Good morning, Sudeep'}</span><h1>{title}</h1><p>{subtitle}</p></div><div className="dashboard-actions"><button className="dashboard-light-button">Download report</button><button className="dashboard-primary-button">{role === 'admin' ? '+ Add product' : '+ Add new product'}</button></div></div>{children}</div></div></div>;
}

export const commonVendorNav: NavItem[] = [
  { label: 'Overview', icon: <LayoutDashboard size={16} /> }, { label: 'Products', icon: <ShoppingBag size={16} /> }, { label: 'Orders', icon: <Store size={16} /> }, { label: 'Inventory', icon: <span className="nav-custom-icon">▧</span> }, { label: 'Earnings', icon: <span className="nav-custom-icon">◒</span> }, { label: 'Analytics', icon: <span className="nav-custom-icon">⌁</span> }
];
export const commonAdminNav: NavItem[] = [
  { label: 'Overview', icon: <LayoutDashboard size={16} /> }, { label: 'Orders', icon: <ShoppingBag size={16} /> }, { label: 'Products', icon: <Store size={16} /> }, { label: 'Vendors', icon: <span className="nav-custom-icon">♧</span> }, { label: 'Customers', icon: <span className="nav-custom-icon">♙</span> }, { label: 'Finance', icon: <span className="nav-custom-icon">◒</span> }, { label: 'Analytics', icon: <span className="nav-custom-icon">⌁</span> }
];
