import { getPayrollRuns } from "@/app/actions/payroll";
import Link from "next/link";
import { Eye, Calendar, Copy, XCircle } from "lucide-react";
import ClonePayrollButton from "./ClonePayrollButton";
import DeletePayrollButton from "./DeletePayrollButton";
import PayrollMonthPicker from "./PayrollMonthPicker";

export const metadata = {
    title: "Payroll Runs | Payroll Manager",
};

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
    const { month } = await searchParams;
    const allRuns = await getPayrollRuns();
    const runs = month ? allRuns.filter(r => r.month === month) : allRuns;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1 style={{ margin: 0 }}>Payroll Runs</h1>
                    {month && (
                        <Link href="/payroll" className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <XCircle size={14} /> Clear Filter
                        </Link>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {runs.length > 0 && (
                        <ClonePayrollButton runs={runs.map(r => ({ id: r.id, month: r.month, status: r.status }))} />
                    )}
                    <PayrollMonthPicker existingRuns={allRuns.map(r => r.month)} activeMonth={month || ""} />
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Month</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>USD to PKR Rate</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Websites Processed</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {runs.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No payroll runs created yet. Click "New Import" to upload a CSV.
                                </td>
                            </tr>
                        ) : (
                            runs.map(run => (
                                <tr key={run.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Calendar size={16} color="var(--primary)" />
                                        {run.month}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
                                        ₨ {run.usd_to_pkr_rate.toFixed(2)}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <span style={{ background: 'var(--background)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                                            {run._count.records}
                                        </span>
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
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            <ClonePayrollButton runs={runs.map(r => ({ id: r.id, month: r.month, status: r.status }))} defaultSourceRunId={run.id} isIconButton={true} />
                                            <DeletePayrollButton runId={run.id} month={run.month} status={run.status} />
                                            <Link href={`/payroll/${run.id}`} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', display: 'inline-flex', gap: '0.4rem' }}>
                                                <Eye size={14} /> View Details
                                            </Link>
                                        </div>
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
