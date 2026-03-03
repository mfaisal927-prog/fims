"use client";

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

export default function MembersToolbar() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [q, setQ] = useState(searchParams.get('q') || '');
    const [sort, setSort] = useState(searchParams.get('sort') || 'name_asc');
    const [active, setActive] = useState(searchParams.get('active') === '1');
    const [hasWebsites, setHasWebsites] = useState(searchParams.get('hasWebsites') === '1');

    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            const urlParams = new URLSearchParams();
            if (q) urlParams.set('q', q);
            if (sort !== 'name_asc') urlParams.set('sort', sort);
            if (active) urlParams.set('active', '1');
            if (hasWebsites) urlParams.set('hasWebsites', '1');

            router.push(`${pathname}?${urlParams.toString()}`, { scroll: false });
        }, 300);

        return () => clearTimeout(timeout);
    }, [q, sort, active, hasWebsites, pathname, router]);

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
                <input
                    type="text"
                    className="input"
                    placeholder="Name, phone, email..."
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
                />
            </div>

            <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Sort By</label>
                <select
                    className="input"
                    value={sort}
                    onChange={e => setSort(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
                >
                    <option value="name_asc">Name A→Z</option>
                    <option value="name_desc">Name Z→A</option>
                    <option value="websites_desc">Websites Count High→Low</option>
                    <option value="websites_asc">Websites Count Low→High</option>
                    <option value="status">Status (Active first)</option>
                </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', paddingBottom: '0.5rem' }}>
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
                        checked={hasWebsites}
                        onChange={e => setHasWebsites(e.target.checked)}
                        style={{ width: '1rem', height: '1rem' }}
                    />
                    Has websites
                </label>
            </div>
        </div>
    );
}
