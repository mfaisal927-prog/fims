"use client";

import MonthSelector from "@/components/MonthSelector";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export default function PayrollMonthPicker({ existingRuns, activeMonth }: { existingRuns: string[], activeMonth: string }) {
    const router = useRouter();
    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <MonthSelector currentMonth={activeMonth} onChange={(m) => router.push(`/payroll?month=${m}`)} label="" />
            {activeMonth && !existingRuns.includes(activeMonth) && (
                <button
                    className="btn btn-primary"
                    onClick={() => router.push(`/payroll/import?month=${activeMonth}`)}
                    style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                >
                    <Plus size={16} /> Create Payroll for {activeMonth}
                </button>
            )}
            {!activeMonth && (
                <button
                    className="btn btn-primary"
                    onClick={() => router.push(`/payroll/import`)}
                    style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                >
                    <Plus size={16} /> New Import
                </button>
            )}
        </div>
    );
}
