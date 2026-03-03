"use client";

import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type PerformanceRecord = {
    month: string;
    payable: number;
    paid: number;
    remaining: number;
};

export default function MemberPerformanceGraph({ data }: { data: PerformanceRecord[] }) {
    const [activeTab, setActiveTab] = useState<'payable' | 'paid' | 'remaining'>('payable');

    const chartData = useMemo(() => {
        // We receive the last 6 months in latest->oldest order or chronological depending on DB.
        // We need chronological for graph (oldest->latest)
        return [...data].sort((a, b) => a.month.localeCompare(b.month));
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div style={{ marginTop: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Performance Trend (Last 6 Months)</h2>
                <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No payroll data available yet.
                </div>
            </div>
        );
    }

    const maxVal = Math.max(...chartData.map(d => d.payable));
    const minVal = Math.min(...chartData.map(d => d.payable));

    let growth = 0;
    if (chartData.length >= 2) {
        const last = chartData[chartData.length - 1].payable;
        const prev = chartData[chartData.length - 2].payable;
        if (prev > 0) {
            growth = ((last - prev) / prev) * 100;
        }
    }

    const avg = chartData.reduce((acc, d) => acc + d.payable, 0) / chartData.length;

    const getColor = (tab: string) => {
        if (tab === 'payable') return '#3b82f6'; // blue
        if (tab === 'paid') return '#10b981'; // green
        return '#ef4444'; // red
    };

    return (
        <div style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Performance Trend (Last 6 Months)</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Highest Month Earning</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>₨ {maxVal.toLocaleString('en-US')}</span>
                </div>
                <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Lowest Month Earning</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>₨ {minVal.toLocaleString('en-US')}</span>
                </div>
                <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Growth (MoM)</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 600, color: growth > 0 ? 'var(--success)' : growth < 0 ? 'var(--danger)' : 'inherit' }}>
                        {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                    </span>
                </div>
                <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Average Payable</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>₨ {avg.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('payable')}
                        className="btn"
                        style={{ background: activeTab === 'payable' ? 'rgba(59, 130, 246, 0.1)' : 'var(--background)', color: activeTab === 'payable' ? '#2563eb' : 'inherit', border: `1px solid ${activeTab === 'payable' ? '#3b82f6' : 'var(--border)'}`, fontWeight: activeTab === 'payable' ? 600 : 400 }}
                    >
                        Total Payable
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('paid')}
                        className="btn"
                        style={{ background: activeTab === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'var(--background)', color: activeTab === 'paid' ? '#059669' : 'inherit', border: `1px solid ${activeTab === 'paid' ? '#10b981' : 'var(--border)'}`, fontWeight: activeTab === 'paid' ? 600 : 400 }}
                    >
                        Total Paid
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('remaining')}
                        className="btn"
                        style={{ background: activeTab === 'remaining' ? 'rgba(239, 68, 68, 0.1)' : 'var(--background)', color: activeTab === 'remaining' ? '#dc2626' : 'inherit', border: `1px solid ${activeTab === 'remaining' ? '#ef4444' : 'var(--border)'}`, fontWeight: activeTab === 'remaining' ? 600 : 400 }}
                    >
                        Total Remaining
                    </button>
                </div>

                <div style={{ height: '300px', width: '100%', marginTop: '1rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `₨${val.toLocaleString('en-US')}`} />
                            <Tooltip
                                formatter={(value: any) => [`₨ ${Number(value).toLocaleString()}`, activeTab.charAt(0).toUpperCase() + activeTab.slice(1)] as any}
                                contentStyle={{ borderRadius: '0.5rem', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                            />
                            <Line
                                type="monotone"
                                dataKey={activeTab}
                                stroke={getColor(activeTab)}
                                strokeWidth={3}
                                dot={{ fill: getColor(activeTab), strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
