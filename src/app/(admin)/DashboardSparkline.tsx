"use client";

import { useMemo, useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, Line, YAxis } from "recharts";

type SparklineData = {
    month: string;
    payable: number;
};

export default function DashboardSparkline({ data }: { data: SparklineData[] }) {
    const chartData = useMemo(() => {
        // Sort chronologically for the line going left-to-right
        return [...data].sort((a, b) => a.month.localeCompare(b.month));
    }, [data]);

    if (!chartData || chartData.length < 2) {
        return <div style={{ height: '30px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Not enough data</div>;
    }

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // calc trend
    const first = chartData[0].payable;
    const last = chartData[chartData.length - 1].payable;
    const isUp = last >= first;
    const color = isUp ? '#10b981' : '#ef4444';

    if (!isMounted) return <div style={{ height: '30px', width: '60px', flexShrink: 0 }} />;

    return (
        <div style={{ height: '30px', width: '60px', flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <YAxis domain={['dataMin', 'dataMax']} hide />
                    <Line
                        type="monotone"
                        dataKey="payable"
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
