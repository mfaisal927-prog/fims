"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const navLinks = [
    { name: 'Dashboard', path: '/' },
    { name: 'Members', path: '/members' },
    { name: 'Websites', path: '/websites' },
    { name: 'Payroll', path: '/payroll' },
    { name: 'Silsila', path: '/silsila' },
    { name: 'Finance', path: '/finance' },
    { name: 'Alerts', path: '/alerts' },
    { name: 'Settings', path: '/settings' },
    { name: 'Initial Import', path: '/initial-import' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        Payroll Manager
      </div>
      <nav className="sidebar-nav">
        {navLinks.map((link) => {
          const isActive = pathname === link.path || pathname?.startsWith(link.path + '/');
          // Fix for dashboard active state on root
          const isExactActive = link.path === '/' ? pathname === '/' : isActive;

          return (
            <Link
              key={link.path}
              href={link.path}
              className={`sidebar-link ${isExactActive ? 'active' : ''}`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
