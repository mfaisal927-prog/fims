import { getSilsilaMonthData } from "@/app/actions/silsila";
import SilsilaMonthClient from "./SilsilaMonthClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import SilsilaMonthSwitch from "./SilsilaMonthSwitch";

export const metadata = {
    title: "Silsila Allocation Details | Payroll Manager",
};

export default async function SilsilaMonthPage({ params }: { params: Promise<{ month: string }> }) {
    const { month } = await params;

    // Also export the report? We could do this using a download link, similar to payroll exports.

    const data = await getSilsilaMonthData(month);

    if (!data.enabled) {
        return (
            <div>
                <h1>Silsila Disabled</h1>
                <p>The Silsila Allocation System is currently disabled in Settings.</p>
                <Link href="/settings" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                    Go to Settings
                </Link>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link href="/silsila" className="btn" style={{ padding: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)' }}>
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1>Silsila Distribution: {month}</h1>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Manage monthly allocations for your recipients</p>
                    </div>
                </div>
                <SilsilaMonthSwitch currentMonth={month} />
            </div>

            <SilsilaMonthClient initialData={data} month={month} />
        </div>
    );
}
