"use client";

import { useRouter } from "next/navigation";
import MonthSelector from "@/components/MonthSelector";

export default function SilsilaMonthSwitch({ currentMonth }: { currentMonth: string }) {
    const router = useRouter();

    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Change Month:</span>
            <MonthSelector
                currentMonth={currentMonth}
                onChange={(month) => router.push(`/silsila/${month}`)}
                label=""
            />
        </div>
    );
}
