"use client";

import { useState } from "react";

export default function MonthSelector({
    currentMonth,
    onChange,
    label = "Select Month:"
}: {
    currentMonth?: string,
    onChange: (month: string) => void,
    label?: string
}) {
    // Generate months
    const date = new Date();
    date.setMonth(date.getMonth() + 2); // Start from next 2 months
    const months = [];
    for (let i = 0; i < 15; i++) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        months.push(`${y}-${m}`);
        date.setMonth(date.getMonth() - 1);
    }

    // Check if currentMonth is in predefined list
    const isCustom = currentMonth && !months.includes(currentMonth);

    const [showPicker, setShowPicker] = useState(isCustom);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {label && <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</label>}

            {!showPicker ? (
                <select
                    className="input"
                    style={{ padding: '0.4rem 0.75rem', minWidth: '150px' }}
                    value={currentMonth || ""}
                    onChange={(e) => {
                        if (e.target.value === "custom") {
                            setShowPicker(true);
                        } else if (e.target.value) {
                            onChange(e.target.value);
                        }
                    }}
                >
                    <option value="" disabled>Select...</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                    <option value="custom">Custom (Calendar)...</option>
                </select>
            ) : (
                <div style={{ display: 'flex', gap: '0.2rem' }}>
                    <input
                        type="month"
                        className="input"
                        value={currentMonth || ""}
                        onChange={(e) => {
                            if (e.target.value) onChange(e.target.value);
                        }}
                        style={{ padding: '0.4rem 0.75rem' }}
                    />
                    <button className="btn" onClick={() => setShowPicker(false)} style={{ padding: '0.4rem' }}>x</button>
                </div>
            )}
        </div>
    );
}
