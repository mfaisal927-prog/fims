"use client";

import { useState } from "react";
import { updateDistribution } from "@/app/actions/silsila";
import { Save, CheckCircle, Clock } from "lucide-react";

export default function SilsilaMonthClient({ initialData, month }: { initialData: any, month: string }) {
    const { baseAmount, silsilaPercentage, silsilaTotal, distributions: initialDistributions } = initialData;

    const [distributions, setDistributions] = useState(initialDistributions);
    const [loading, setLoading] = useState(false);

    const totalDistributed = distributions.reduce((sum: number, d: any) => sum + Number(d.paid_amount_pkr || 0), 0);
    const totalAllocated = distributions.reduce((sum: number, d: any) => sum + Number(d.allocated_amount_pkr || 0), 0);
    const remainingBalance = silsilaTotal - totalDistributed;

    const handleChange = (index: number, field: string, value: any) => {
        const newDistributions = [...distributions];
        newDistributions[index][field] = value;
        setDistributions(newDistributions);
    };

    const handleSave = async (index: number) => {
        const d = distributions[index];
        setLoading(true);
        try {
            await updateDistribution(d.id, Number(d.allocated_amount_pkr), Number(d.paid_amount_pkr), d.status, d.notes, d.payment_date);
            alert('Saved successfully');
        } catch (error) {
            alert('Failed to save');
        }
        setLoading(false);
    };

    const handleMarkPaid = (index: number) => {
        const newDistributions = [...distributions];
        newDistributions[index].paid_amount_pkr = newDistributions[index].allocated_amount_pkr;
        newDistributions[index].status = "PAID";
        newDistributions[index].payment_date = new Date().toISOString().split('T')[0];
        setDistributions(newDistributions);
    };

    const handleReset = (index: number) => {
        const newDistributions = [...distributions];
        newDistributions[index].paid_amount_pkr = 0;
        newDistributions[index].status = "PENDING";
        newDistributions[index].payment_date = null;
        setDistributions(newDistributions);
    };

    const handleDownloadReport = () => {
        window.location.href = `/api/silsila/export?month=${month}`;
    };

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>Base Amount</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>₨ {baseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>Silsila Allocation ({silsilaPercentage}%)</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>₨ {silsilaTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: remainingBalance < 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>Remaining Balance</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: remainingBalance < 0 ? 'var(--danger)' : remainingBalance === 0 ? 'var(--success)' : 'inherit' }}>
                        ₨ {remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button onClick={handleDownloadReport} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                    Export Month Report (CSV)
                </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Recipient</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Category</th>
                            <th style={{ padding: '1rem', textAlign: 'center', width: '120px' }}>Allocated (PKR)</th>
                            <th style={{ padding: '1rem', textAlign: 'center', width: '120px' }}>Paid (PKR)</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Remaining</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Paid Date</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Notes</th>
                            <th style={{ padding: '1rem', textAlign: 'center', width: '100px' }}>Status</th>
                            <th style={{ padding: '1rem', textAlign: 'center', width: '150px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {distributions.map((d: any, index: number) => (
                            <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem', fontWeight: 600 }}>
                                    {d.recipient.name}
                                    {d.recipient.default_share && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Default: {d.recipient.default_share}%</div>}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{ background: 'var(--background)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                                        {d.recipient.category}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={d.allocated_amount_pkr}
                                        onChange={(e) => handleChange(index, 'allocated_amount_pkr', e.target.value)}
                                        style={{ width: '100px', padding: '0.4rem', textAlign: 'center' }}
                                        disabled={baseAmount <= 0}
                                    />
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={d.paid_amount_pkr}
                                        onChange={(e) => handleChange(index, 'paid_amount_pkr', e.target.value)}
                                        style={{ width: '100px', padding: '0.4rem', textAlign: 'center' }}
                                        disabled={baseAmount <= 0}
                                    />
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
                                    {Math.max(0, d.allocated_amount_pkr - d.paid_amount_pkr).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={d.payment_date ? new Date(d.payment_date).toISOString().split('T')[0] : ''}
                                        onChange={(e) => handleChange(index, 'payment_date', e.target.value)}
                                        style={{ padding: '0.4rem' }}
                                        disabled={baseAmount <= 0}
                                    />
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={d.notes || ''}
                                        onChange={(e) => handleChange(index, 'notes', e.target.value)}
                                        style={{ padding: '0.4rem' }}
                                        placeholder="Optional notes"
                                        disabled={baseAmount <= 0}
                                    />
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <select
                                        className="form-control"
                                        value={d.status}
                                        onChange={(e) => handleChange(index, 'status', e.target.value)}
                                        style={{ padding: '0.4rem', width: '100px' }}
                                        disabled={baseAmount <= 0}
                                    >
                                        <option value="PENDING">Pending</option>
                                        <option value="PARTIAL">Partial</option>
                                        <option value="PAID">Paid</option>
                                    </select>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        <button onClick={() => handleSave(index)} disabled={loading || baseAmount <= 0} className="btn btn-primary" style={{ padding: '0.4rem 0.6rem' }} title="Save">
                                            <Save size={14} />
                                        </button>
                                        <button onClick={() => handleMarkPaid(index)} disabled={loading || baseAmount <= 0 || d.status === 'PAID'} className="btn" style={{ padding: '0.4rem 0.6rem', background: 'var(--success)', color: 'white' }} title="Mark Paid">
                                            <CheckCircle size={14} />
                                        </button>
                                        <button onClick={() => handleReset(index)} disabled={loading || baseAmount <= 0 || (d.paid_amount_pkr == 0 && d.status === 'PENDING')} className="btn" style={{ padding: '0.4rem 0.6rem', background: 'var(--card)', border: '1px solid var(--border)' }} title="Reset">
                                            <Clock size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ backgroundColor: 'var(--background)', fontWeight: 'bold' }}>
                            <td colSpan={2} style={{ padding: '1rem', textAlign: 'right' }}>Totals:</td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                ₨ {totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center', color: totalDistributed > silsilaTotal ? 'var(--danger)' : 'inherit' }}>
                                ₨ {totalDistributed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td colSpan={5}></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {baseAmount <= 0 && (
                <div style={{ padding: '1rem', backgroundColor: '#FFFBEB', color: '#B45309', borderRadius: '0.375rem', marginTop: '1.5rem', fontWeight: 600, border: '1px solid #FDE68A' }}>
                    Silsila logic is read-only because Final Net is zero or negative.
                </div>
            )}

            {remainingBalance < 0 && silsilaTotal > 0 && totalDistributed > silsilaTotal && (
                <div style={{ padding: '1rem', backgroundColor: 'var(--danger)', color: 'white', borderRadius: '0.375rem', marginTop: '1.5rem' }}>
                    <strong>Warning:</strong> The total distributed amount exceeds the available Silsila allocation by ₨ {Math.abs(remainingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}.
                </div>
            )}
        </div>
    );
}
