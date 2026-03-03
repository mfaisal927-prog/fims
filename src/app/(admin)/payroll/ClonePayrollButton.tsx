"use client";

import { useState } from "react";
import { Copy, Plus, X } from "lucide-react";
import { clonePayrollRun } from "@/app/actions/payroll";
import { useRouter } from "next/navigation";

export default function ClonePayrollButton({
    runs,
    defaultSourceRunId,
    isIconButton = false
}: {
    runs: { id: string, month: string, status: string }[];
    defaultSourceRunId?: string;
    isIconButton?: boolean;
}) {
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [newMonth, setNewMonth] = useState("");
    const [usdRate, setUsdRate] = useState<number | ''>("");
    const [sourceRunId, setSourceRunId] = useState(defaultSourceRunId || (runs.length > 0 ? runs[0].id : ""));
    const [copyPaid, setCopyPaid] = useState(false);

    const router = useRouter();

    if (runs.length === 0) return null;

    const handleOpen = () => {
        // compute next month as default string
        const d = new Date();
        const yyyy = d.getFullYear();
        let mm = d.getMonth() + 1;
        setNewMonth(`${yyyy}-${String(mm).padStart(2, '0')}`);

        // try to get latest finalized or just latest
        const latest = defaultSourceRunId || runs.find(r => r.status === 'final')?.id || runs[0].id;
        setSourceRunId(latest);

        setShowModal(true);
        setErrorMsg("");
    };

    const handleClone = async () => {
        if (!newMonth.trim()) {
            setErrorMsg("New Payroll Month is required.");
            return;
        }
        if (!newMonth.match(/^\d{4}-\d{2}$/)) {
            setErrorMsg("Month format must be YYYY-MM.");
            return;
        }

        setLoading(true);
        setErrorMsg("");
        try {
            const res = await clonePayrollRun(
                sourceRunId,
                newMonth,
                typeof usdRate === 'number' ? usdRate : 0,
                copyPaid
            );

            if (res.error) {
                setErrorMsg(res.message || "Failed to clone.");
                setLoading(false);
            } else if (res.success && res.runId) {
                setShowModal(false);
                setLoading(false);
                const sourceMonth = runs.find(r => r.id === sourceRunId)?.month;
                router.push(`/payroll/${res.runId}?clonedFrom=${sourceMonth}`);
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Something went wrong.");
            setLoading(false);
        }
    };

    return (
        <>
            {isIconButton ? (
                <button type="button" onClick={handleOpen} className="btn" style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', display: 'inline-flex', gap: '0.4rem', backgroundColor: 'var(--background)' }} title="Clone this month">
                    <Copy size={14} /> Clone
                </button>
            ) : (
                <button type="button" onClick={handleOpen} className="btn" style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--background)' }}>
                    <Copy size={18} /> Clone Last Month
                </button>
            )}

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
                    <div style={{ backgroundColor: 'var(--card)', padding: '2rem', borderRadius: '0.75rem', maxWidth: '400px', width: '100%', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Clone Payroll</h2>
                            <button onClick={() => setShowModal(false)} className="btn" style={{ padding: '0.25rem', background: 'transparent', border: 'none' }}><X size={20} /></button>
                        </div>

                        {errorMsg && (
                            <div style={{ background: 'var(--danger)', color: 'white', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                                {errorMsg}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label>Source Month</label>
                                <select className="form-control" value={sourceRunId} onChange={e => setSourceRunId(e.target.value)}>
                                    {runs.map(r => (
                                        <option key={r.id} value={r.id}>{r.month} {r.status === 'final' ? '(Final)' : '(Draft)'}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                                <label>New Payroll Month</label>
                                <input type="month" className="form-control" value={newMonth} onChange={e => setNewMonth(e.target.value)} required />
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                                <label>USD to PKR Rate (Optional)</label>
                                <input type="number" step="0.01" className="form-control" placeholder="e.g. 280.5" value={usdRate} onChange={e => setUsdRate(parseFloat(e.target.value) || '')} />
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', background: 'var(--background)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                                <input type="checkbox" checked={copyPaid} onChange={e => setCopyPaid(e.target.checked)} />
                                <div style={{ fontSize: '0.9rem' }}>Copy paid amounts?</div>
                            </label>

                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                            <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ background: 'transparent' }}>Cancel</button>
                            <button type="button" className="btn btn-primary" onClick={handleClone} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {loading ? 'Cloning...' : <><Copy size={16} /> Create Clone</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
