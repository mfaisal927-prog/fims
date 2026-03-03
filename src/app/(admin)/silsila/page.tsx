import prisma from "@/lib/prisma";
import Link from "next/link";
import { Users, Calendar, ArrowRight } from "lucide-react";
import SilsilaMonthPicker from "./SilsilaMonthPicker";

export const metadata = {
    title: "Silsila Allocation | Payroll Manager",
};

export default async function SilsilaPage() {
    const runs = await prisma.payrollRun.findMany({
        orderBy: { month: "desc" },
    });

    const settings = await prisma.settings.findFirst();
    const isEnabled = settings?.silsila_enabled;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1>Silsila Allocation System</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Manage 33% monthly allocations and distributions
                    </p>
                </div>
                <div>
                    <Link href="/silsila/recipients" className="btn btn-primary" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Users size={18} /> Manage Recipients
                    </Link>
                </div>
            </div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}>
                <SilsilaMonthPicker />
            </div>

            {!isEnabled && (
                <div style={{ padding: '1rem', backgroundColor: 'var(--danger)', color: 'white', borderRadius: '0.375rem', marginBottom: '1.5rem' }}>
                    Silsila feature is currently disabled. You can enable it in Settings.
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Month</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Payroll Status</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {runs.length === 0 ? (
                            <tr>
                                <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No completed payroll months found. You can manually open a month using the selector above.
                                </td>
                            </tr>
                        ) : (
                            runs.map(run => (
                                <tr key={run.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Calendar size={16} color="var(--primary)" />
                                        {run.month}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.25rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            backgroundColor: run.status === 'final' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                                            color: run.status === 'final' ? 'var(--success)' : '#ca8a04'
                                        }}>
                                            {run.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <Link href={`/silsila/${run.month}`} className="btn btn-primary" style={{ display: 'inline-flex', padding: '0.4rem 0.75rem', fontSize: '0.875rem', gap: '0.4rem', alignItems: 'center' }}>
                                            View Allocation <ArrowRight size={14} />
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
