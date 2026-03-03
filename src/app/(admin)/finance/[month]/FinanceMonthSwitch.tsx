"use client";

import { useRouter } from "next/navigation";
import MonthSelector from "@/components/MonthSelector";

export default function FinanceMonthSwitch({ currentMonth }: { currentMonth: string }) {
    const router = useRouter();
    return (
        <MonthSelector
            currentMonth={currentMonth}
            onChange={(m) => router.push(`/finance/${m}`)}
            label="Change Month:"
        />
    );
}
