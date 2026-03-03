"use client";

import { useRouter } from "next/navigation";
import MonthSelector from "@/components/MonthSelector";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function FinanceMonthPicker() {
    const router = useRouter();
    const [month, setMonth] = useState("");

    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <MonthSelector
                currentMonth={month}
                onChange={(m) => {
                    setMonth(m);
                    router.push(`/finance/${m}`);
                }}
                label=""
            />
            {month && (
                <button
                    className="btn btn-primary"
                    onClick={() => router.push(`/finance/${month}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={16} /> Create / Open {month}
                </button>
            )}
        </div>
    );
}
