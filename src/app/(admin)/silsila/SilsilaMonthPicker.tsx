"use client";

import { useRouter } from "next/navigation";
import MonthSelector from "@/components/MonthSelector";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function SilsilaMonthPicker() {
    const router = useRouter();
    const [month, setMonth] = useState("");

    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <MonthSelector
                currentMonth={month}
                onChange={(m) => {
                    setMonth(m);
                    router.push(`/silsila/${m}`);
                }}
                label=""
            />
            {month && (
                <button
                    className="btn btn-primary"
                    onClick={() => router.push(`/silsila/${month}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={16} /> Open {month}
                </button>
            )}
        </div>
    );
}
