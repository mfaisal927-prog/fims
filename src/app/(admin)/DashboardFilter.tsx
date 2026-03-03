"use client";

import { useRouter } from 'next/navigation';
import MonthSelector from '@/components/MonthSelector';

export default function DashboardFilter({
    runs,
    currentMonth
}: {
    runs: { month: string, id: string }[],
    currentMonth: string | undefined
}) {
    const router = useRouter();

    return (
        <div style={{ background: 'var(--card)', padding: '0.2rem 1rem', borderRadius: '2rem', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <MonthSelector
                currentMonth={currentMonth}
                onChange={(m) => router.push(`/?month=${m}`)}
                label="Dashboard Month:"
            />
        </div>
    );
}
