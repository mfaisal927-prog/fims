"use client";

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Search } from 'lucide-react';

export default function WebsitesToolbar() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [q, setQ] = useState(searchParams.get('q') || '');
    const [sort, setSort] = useState(searchParams.get('sort') || 'domain_asc');
    const [active, setActive] = useState(searchParams.get('active') === '1');
    const [unassigned, setUnassigned] = useState(searchParams.get('unassigned') === '1');
    const [percentZero, setPercentZero] = useState(searchParams.get('percentZero') === '1');

    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            const urlParams = new URLSearchParams();
            if (q) urlParams.set('q', q);
            if (sort !== 'domain_asc') urlParams.set('sort', sort);
            if (active) urlParams.set('active', '1');
            if (unassigned) urlParams.set('unassigned', '1');
            if (percentZero) urlParams.set('percentZero', '1');

            router.push(`${pathname}?${urlParams.toString()}`, { scroll: false });
        }, 300);

        return () => clearTimeout(timeout);
    }, [q, sort, active, unassigned, percentZero, pathname, router]);

    return (
        <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1.5rem',
            backgroundColor: 'var(--background)',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border)',
            alignItems: 'flex-end'
        }}>
            <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Search</label>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="input"
                        placeholder="Search website or member..."
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', paddingLeft: '2.25rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
                    />
                </div>
            </div>

            <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Sort By</label>
                <select
                    className="input"
                    value={sort}
                    onChange={e => setSort(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
                >
                    <option value="domain_asc">Domain A→Z</option>
                    <option value="domain_desc">Domain Z→A</option>
                    <option value="percent_desc">Percentage High→Low</option>
                    <option value="percent_asc">Percentage Low→High</option>
                    <option value="member_asc">Member Name A→Z</option>
                    <option value="member_desc">Member Name Z→A</option>
                </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                    <input
                        type="checkbox"
                        checked={active}
                        onChange={e => setActive(e.target.checked)}
                        style={{ width: '1rem', height: '1rem' }}
                    />
                    Active only
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                    <input
                        type="checkbox"
                        checked={unassigned}
                        onChange={e => setUnassigned(e.target.checked)}
                        style={{ width: '1rem', height: '1rem' }}
                    />
                    Unassigned only
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                    <input
                        type="checkbox"
                        checked={percentZero}
                        onChange={e => setPercentZero(e.target.checked)}
                        style={{ width: '1rem', height: '1rem' }}
                    />
                    Percentage = 0 only
                </label>
            </div>
        </div>
    );
}
