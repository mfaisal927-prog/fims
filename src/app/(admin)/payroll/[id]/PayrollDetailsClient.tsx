"use client";

import { useState, useMemo, useEffect } from "react";
import { updatePaidAmount, markAllFullyPaidForMember, finalizePayroll, reopenPayroll } from "@/app/actions/payroll";
import { ArrowLeft, CheckCircle, Save, Lock, Unlock, Download, FileText, ChevronDown, ChevronRight, Search, Info, Copy, Edit3, Trash2 } from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";
import { useSearchParams } from "next/navigation";
import { addAdjustment, deleteAdjustment } from "@/app/actions/adjustments";

export default function PayrollDetailsClient({ run }: { run: any }) {

    const [viewMode, setViewModeState] = useState<'site' | 'member'>('site');
    const [isMounted, setIsMounted] = useState(false);
    const searchParams = useSearchParams();
    const clonedFrom = searchParams.get('clonedFrom');

    // Member View States
    const [memberSearch, setMemberSearch] = useState("");
    const [memberSort, setMemberSort] = useState("total_payable_desc");
    const [memberRemainingOnly, setMemberRemainingOnly] = useState(false);
    const [memberUnpaidOnly, setMemberUnpaidOnly] = useState(false);
    const [memberHideZeroSites, setMemberHideZeroSites] = useState(false);
    const [expandedMembers, setExpandedMembers] = useState<string[]>([]);

    useEffect(() => {
        const savedMode = localStorage.getItem('payrollViewMode');
        if (savedMode === 'member' || savedMode === 'site') setViewModeState(savedMode);

        const savedSort = localStorage.getItem('payrollMemberSort');
        if (savedSort) setMemberSort(savedSort);

        const savedRemaining = localStorage.getItem('payrollMemberRemainingOnly');
        if (savedRemaining !== null) setMemberRemainingOnly(savedRemaining === 'true');

        const savedUnpaid = localStorage.getItem('payrollMemberUnpaidOnly');
        if (savedUnpaid !== null) setMemberUnpaidOnly(savedUnpaid === 'true');

        const savedHideZero = localStorage.getItem('payrollMemberHideZeroSites');
        if (savedHideZero !== null) setMemberHideZeroSites(savedHideZero === 'true');

        setIsMounted(true);
    }, []);

    const setViewMode = (mode: 'site' | 'member') => {
        setViewModeState(mode);
        localStorage.setItem('payrollViewMode', mode);
    };

    const handleMemberSortChange = (val: string) => {
        setMemberSort(val);
        localStorage.setItem('payrollMemberSort', val);
    };

    const handleRemainingOnlyChange = (val: boolean) => {
        setMemberRemainingOnly(val);
        localStorage.setItem('payrollMemberRemainingOnly', String(val));
    };

    const handleUnpaidOnlyChange = (val: boolean) => {
        setMemberUnpaidOnly(val);
        localStorage.setItem('payrollMemberUnpaidOnly', String(val));
    };

    const handleHideZeroSitesChange = (val: boolean) => {
        setMemberHideZeroSites(val);
        localStorage.setItem('payrollMemberHideZeroSites', String(val));
    };

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [reopenModal, setReopenModal] = useState(false);
    const [reason, setReason] = useState("");

    const isFinal = run.status === 'final';

    const toggleExpand = (id: string) => {
        setExpandedMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // Adjustment Modal States
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [adjustmentMemberId, setAdjustmentMemberId] = useState<string | null>(null);
    const [adjustmentType, setAdjustmentType] = useState("Bonus");
    const [adjustmentAmount, setAdjustmentAmount] = useState("");
    const [adjustmentNote, setAdjustmentNote] = useState("");

    // Group by Member for Summary Table
    const adjustmentsByMember = useMemo(() => {
        const map = new Map();
        (run.adjustments || []).forEach((a: any) => {
            if (!map.has(a.member_id)) map.set(a.member_id, []);
            map.get(a.member_id).push(a);
        });
        return map;
    }, [run]);
    const memberSummary = useMemo(() => {
        const map = new Map();
        for (const r of run.records) {
            if (!map.has(r.member_id)) {
                map.set(r.member_id, {
                    member_id: r.member_id,
                    name: r.member.full_name,
                    total_usd_share: 0,
                    total_payable: 0,
                    total_paid: 0,
                    total_remaining: 0,
                    websites_count: 0,
                    records: []
                });
            }
            const m = map.get(r.member_id);
            m.total_usd_share += (r.usd_amount * (r.percentage / 100));
            m.total_payable += r.payable_pkr;
            m.total_paid += r.paid_pkr;
            m.total_remaining += r.remaining_pkr;
            m.websites_count += 1;
            m.records.push(r);
        }

        for (const [memberId, m] of Array.from(map.entries())) {
            const adjs = adjustmentsByMember.get(memberId) || [];
            m.adjustments = adjs;

            for (const a of adjs) {
                if (a.type === 'Bonus') {
                    m.total_payable += a.amount;
                    m.total_remaining += a.amount;
                } else if (a.type === 'Deduction') {
                    m.total_payable -= a.amount;
                    m.total_remaining -= a.amount;
                } else if (a.type === 'Extra Payment') {
                    m.total_paid += a.amount;
                    m.total_remaining -= a.amount;
                } else if (a.type === 'Manual Override') {
                    m.total_paid = a.amount;
                    m.total_remaining = m.total_payable - m.total_paid;
                }
            }
        }

        return Array.from(map.values());
    }, [run, adjustmentsByMember]);

    const finalMemberSummary = useMemo(() => {
        let filtered = memberSummary;

        if (memberSearch) {
            const q = memberSearch.toLowerCase();
            filtered = filtered.filter(m => m.name.toLowerCase().includes(q));
        }
        if (memberRemainingOnly) {
            filtered = filtered.filter(m => m.total_remaining > 0);
        }
        if (memberUnpaidOnly) {
            filtered = filtered.filter(m => m.total_paid === 0);
        }
        if (memberHideZeroSites) {
            filtered = filtered.filter(m => m.websites_count > 0);
        }

        filtered.sort((a, b) => {
            switch (memberSort) {
                case 'total_payable_desc': return b.total_payable - a.total_payable;
                case 'total_payable_asc': return a.total_payable - b.total_payable;
                case 'total_remaining_desc': return b.total_remaining - a.total_remaining;
                case 'total_remaining_asc': return a.total_remaining - b.total_remaining;
                case 'total_usd_desc': return b.total_usd_share - a.total_usd_share;
                case 'name_asc': return a.name.localeCompare(b.name);
                case 'name_desc': return b.name.localeCompare(a.name);
                default: return b.total_payable - a.total_payable;
            }
        });

        return filtered;
    }, [memberSummary, memberSearch, memberRemainingOnly, memberUnpaidOnly, memberHideZeroSites, memberSort]);

    const expandAll = () => {
        setExpandedMembers(finalMemberSummary.map(m => m.member_id));
    };

    const collapseAll = () => {
        setExpandedMembers([]);
    };


    const handleSavePaid = async (recordId: string, maxPayable: number) => {
        let val = parseFloat(editValue);
        if (isNaN(val)) val = 0;
        if (val > maxPayable) val = maxPayable;

        setLoading(true);
        await updatePaidAmount(recordId, val);
        setEditingId(null);
        setLoading(false);
    };

    const markFullyPaid = async (recordId: string, payablePkr: number) => {
        setLoading(true);
        await updatePaidAmount(recordId, payablePkr);
        setLoading(false);
    };

    const markMemberFullyPaid = async (memberId: string) => {
        setLoading(true);
        await markAllFullyPaidForMember(run.id, memberId);
        setLoading(false);
    };

    const handleOpenAdjustment = (memberId: string) => {
        setAdjustmentMemberId(memberId);
        setAdjustmentType("Bonus");
        setAdjustmentAmount("");
        setAdjustmentNote("");
        setIsAdjustmentModalOpen(true);
    };

    const handleSaveAdjustment = async () => {
        if (!adjustmentMemberId || !adjustmentAmount || !adjustmentNote.trim()) return;
        setLoading(true);
        await addAdjustment(
            run.id,
            adjustmentMemberId,
            adjustmentType,
            parseFloat(adjustmentAmount),
            adjustmentNote
        );
        setIsAdjustmentModalOpen(false);
        setLoading(false);
    };

    const handleDeleteAdjustment = async (id: string) => {
        if (!confirm("Are you sure you want to delete this adjustment?")) return;
        setLoading(true);
        await deleteAdjustment(id);
        setLoading(false);
    };

    const formatCurrency = (val: number) => `₨ ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatUSD = (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const handleFinalize = async () => {
        if (!confirm("Are you sure you want to finalize this payroll run? Editing will be locked.")) return;
        setLoading(true);
        await finalizePayroll(run.id);
        setLoading(false);
    };

    const handleReopen = async () => {
        if (!reason.trim()) return;
        setLoading(true);
        await reopenPayroll(run.id, reason);
        setReopenModal(false);
        setReason("");
        setLoading(false);
    };

    const exportSiteWise = () => {
        const data = run.records.map((r: any) => ({
            Site: r.site,
            Member: r.member.full_name,
            USD: r.usd_amount,
            USD_Rate: r.usd_rate,
            Total_PKR: r.total_pkr,
            Percent: r.percentage,
            Payable_PKR: r.payable_pkr,
            Paid_PKR: r.paid_pkr,
            Remaining_PKR: r.remaining_pkr
        }));
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sitewise_Payroll_${run.month}.csv`;
        a.click();
    };

    const exportMemberSummary = () => {
        const data = memberSummary.map(m => ({
            Member: m.name,
            Total_USD_Share: m.total_usd_share,
            Total_Payable_PKR: m.total_payable,
            Total_Paid_PKR: m.total_paid,
            Total_Remaining_PKR: m.total_remaining
        }));
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Member_Summary_${run.month}.csv`;
        a.click();
    };

    const exportSingleMemberSummary = (memberId: string, name: string) => {
        const m = memberSummary.find(x => x.member_id === memberId);
        if (!m) return;
        const data = m.records.map((r: any) => ({
            Site: r.site,
            USD: r.usd_amount,
            USD_Rate: r.usd_rate,
            Total_PKR: r.total_pkr,
            Percent: r.percentage,
            Payable_PKR: r.payable_pkr,
            Paid_PKR: r.paid_pkr,
            Remaining_PKR: r.remaining_pkr
        }));
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}_Sites_Payroll_${run.month}.csv`;
        a.click();
    };

    const renderSiteRow = (r: any) => (
        <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: r.remaining_pkr === 0 && r.payable_pkr > 0 ? 'rgba(16, 185, 129, 0.05)' : r.usd_amount === 0 ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
            <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--primary)' }}>
                {r.site}
                {r.usd_amount === 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem', fontWeight: 400 }}>
                        <Info size={12} /> No earnings this month
                    </div>
                )}
            </td>
            {viewMode === 'site' && <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{r.member.full_name}</td>}
            <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--success)' }}>{formatUSD(r.usd_amount)}</td>
            {viewMode === 'site' && <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem' }}>{r.usd_rate}</td>}
            {viewMode === 'site' && <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{formatCurrency(r.total_pkr)}</td>}
            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{r.percentage}%</td>
            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(r.payable_pkr)}</td>

            {/* Editable Paid PKR */}
            <td style={{ padding: '1rem', textAlign: 'right' }}>
                {editingId === r.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <input
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="form-control"
                            style={{ width: '100px', padding: '0.25rem', margin: 0 }}
                            autoFocus
                        />
                        <button onClick={() => handleSavePaid(r.id, r.payable_pkr)} disabled={loading} style={{ color: 'var(--success)' }}>
                            <Save size={18} />
                        </button>
                    </div>
                ) : (
                    <div
                        style={{ cursor: isFinal ? 'default' : 'pointer', borderBottom: isFinal ? 'none' : '1px dashed var(--text-muted)', display: 'inline-block' }}
                        onClick={() => { if (!isFinal) { setEditingId(r.id); setEditValue(r.paid_pkr.toString()); } }}
                    >
                        {formatCurrency(r.paid_pkr)}
                    </div>
                )}
            </td>

            <td style={{ padding: '1rem', textAlign: 'right', color: r.remaining_pkr > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                {formatCurrency(r.remaining_pkr)}
            </td>
            <td style={{ padding: '1rem', textAlign: 'center' }}>
                <button
                    onClick={() => markFullyPaid(r.id, r.payable_pkr)}
                    disabled={loading || r.remaining_pkr === 0 || isFinal}
                    title="Mark Fully Paid"
                    className="btn"
                    style={{ padding: '0.25rem', color: r.remaining_pkr === 0 ? 'var(--text-muted)' : 'var(--success)' }}
                >
                    <CheckCircle size={20} />
                </button>
            </td>
        </tr>
    );

    if (!isMounted) {
        return (
            <div style={{ minHeight: '50vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                Loading payroll details...
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <Link href="/payroll" className="btn" style={{ padding: '0.5rem', background: 'var(--card)', border: '1px solid var(--border)' }}>
                        <ArrowLeft size={18} />
                    </Link>
                    <h1 style={{ margin: 0 }}>Payroll Details - {run.month}</h1>
                    <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        backgroundColor: run.status === 'final' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                        color: run.status === 'final' ? 'var(--success)' : '#ca8a04',
                        marginLeft: '1rem'
                    }}>
                        {run.status}
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', backgroundColor: 'var(--background)', borderRadius: '0.375rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
                        <button
                            className={`btn ${viewMode === 'site' ? 'btn-primary' : ''}`}
                            style={{ borderRadius: 0, border: 'none', borderRight: '1px solid var(--border)', fontWeight: 600 }}
                            onClick={() => setViewMode('site')}
                        >
                            Site View
                        </button>
                        <button
                            className={`btn ${viewMode === 'member' ? 'btn-primary' : ''}`}
                            style={{ borderRadius: 0, border: 'none', fontWeight: 600 }}
                            onClick={() => setViewMode('member')}
                        >
                            Member View
                        </button>
                    </div>

                    <div style={{ padding: '0.5rem 1rem', background: 'var(--card)', borderRadius: '0.375rem', border: '1px solid var(--border)', fontWeight: 600 }}>
                        Rate: ₨ {run.usd_to_pkr_rate.toFixed(2)}
                    </div>
                    {isFinal ? (
                        <button onClick={() => setReopenModal(true)} disabled={loading} className="btn" style={{ display: 'flex', gap: '0.5rem', background: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' }}>
                            <Unlock size={18} /> Re-open
                        </button>
                    ) : (
                        <button onClick={handleFinalize} disabled={loading} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem' }}>
                            <Lock size={18} /> Finalize
                        </button>
                    )}
                </div>
            </div>

            {clonedFrom && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '0.5rem', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Copy size={20} color="#3b82f6" />
                    <div>
                        <div style={{ fontWeight: 600 }}>Cloned from {clonedFrom}.</div>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                            You can now <Link href="/payroll/import" style={{ textDecoration: 'underline', color: '#1d4ed8', fontWeight: 600 }}>upload the new month CSV</Link> to fill USD earnings.
                        </div>
                    </div>
                </div>
            )}

            {reopenModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div className="card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Re-open Payroll</h3>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Editing will be re-enabled. Please provide a reason for the audit log.</p>
                        <input type="text" className="form-control" placeholder="Reason..." value={reason} onChange={e => setReason(e.target.value)} />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button onClick={() => setReopenModal(false)} className="btn" style={{ background: 'var(--background)' }}>Cancel</button>
                            <button onClick={handleReopen} disabled={!reason.trim() || loading} className="btn btn-primary">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {isAdjustmentModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div className="card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Adjust Payment</h3>

                        <div className="form-group">
                            <label>Adjustment Type</label>
                            <select className="input" value={adjustmentType} onChange={e => setAdjustmentType(e.target.value)}>
                                <option>Bonus</option>
                                <option>Extra Payment</option>
                                <option>Deduction</option>
                                <option>Manual Override</option>
                            </select>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {adjustmentType === 'Bonus' && 'Adds to total payable'}
                                {adjustmentType === 'Extra Payment' && 'Adds to total paid'}
                                {adjustmentType === 'Deduction' && 'Subtracts from total payable'}
                                {adjustmentType === 'Manual Override' && 'Sets total paid exactly to amount'}
                            </span>
                        </div>

                        <div className="form-group">
                            <label>Amount (PKR)</label>
                            <input type="number" className="input" min="0" value={adjustmentAmount} onChange={e => setAdjustmentAmount(e.target.value)} />
                        </div>

                        <div className="form-group">
                            <label>Note / Reason</label>
                            <input type="text" className="input" placeholder="e.g. Eid Bonus" value={adjustmentNote} onChange={e => setAdjustmentNote(e.target.value)} />
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button onClick={() => setIsAdjustmentModalOpen(false)} className="btn" style={{ background: 'var(--background)' }}>Cancel</button>
                            <button onClick={handleSaveAdjustment} disabled={!adjustmentAmount || !adjustmentNote.trim() || loading} className="btn btn-primary">Save Adjustment</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MEMBER VIEW */}
            {viewMode === 'member' && (
                <div>
                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        flexWrap: 'wrap',
                        marginBottom: '1.5rem',
                        backgroundColor: 'var(--card)',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        alignItems: 'flex-end'
                    }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Search Member</label>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Search by name..."
                                    value={memberSearch}
                                    onChange={e => setMemberSearch(e.target.value)}
                                    style={{ width: '100%', padding: '0.5rem', paddingLeft: '2.25rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
                                />
                            </div>
                        </div>

                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Sort By</label>
                            <select
                                className="input"
                                value={memberSort}
                                onChange={e => handleMemberSortChange(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
                            >
                                <option value="total_payable_desc">Total Payable High→Low</option>
                                <option value="total_payable_asc">Total Payable Low→High</option>
                                <option value="total_remaining_desc">Total Remaining High→Low</option>
                                <option value="total_remaining_asc">Total Remaining Low→High</option>
                                <option value="total_usd_desc">Total USD Share High→Low</option>
                                <option value="name_asc">Name A→Z</option>
                                <option value="name_desc">Name Z→A</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                                <input
                                    type="checkbox"
                                    checked={memberRemainingOnly}
                                    onChange={e => handleRemainingOnlyChange(e.target.checked)}
                                    style={{ width: '1rem', height: '1rem' }}
                                />
                                Remaining &gt; 0 only
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                                <input
                                    type="checkbox"
                                    checked={memberUnpaidOnly}
                                    onChange={e => handleUnpaidOnlyChange(e.target.checked)}
                                    style={{ width: '1rem', height: '1rem' }}
                                />
                                Unpaid only (Paid = 0)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                                <input
                                    type="checkbox"
                                    checked={memberHideZeroSites}
                                    onChange={e => handleHideZeroSitesChange(e.target.checked)}
                                    style={{ width: '1rem', height: '1rem' }}
                                />
                                Hide members with 0 websites
                            </label>

                            <div style={{ flex: 1 }}></div>

                            <button onClick={expandAll} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
                                Expand All
                            </button>
                            <button onClick={collapseAll} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
                                Collapse All
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {finalMemberSummary.length === 0 ? (
                            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No members match your filters.
                            </div>
                        ) : (
                            finalMemberSummary.map(m => {
                                const isExpanded = expandedMembers.includes(m.member_id);
                                return (
                                    <div key={m.member_id} style={{ border: '1px solid var(--border)', borderRadius: '0.5rem', backgroundColor: 'var(--card)', overflow: 'hidden' }}>
                                        {/* Accordion Header */}
                                        <div
                                            style={{ display: 'flex', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--background)', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }} onClick={() => toggleExpand(m.member_id)}>
                                                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>{m.name}</span>
                                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{m.websites_count} website{m.websites_count !== 1 ? 's' : ''}</span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '2rem', flex: 2, justifyContent: 'space-around', alignItems: 'center' }} onClick={() => toggleExpand(m.member_id)}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>USD Share</span>
                                                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>{formatUSD(m.total_usd_share)}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Payable</span>
                                                    <span style={{ fontWeight: 600 }}>{formatCurrency(m.total_payable)}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Paid</span>
                                                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{formatCurrency(m.total_paid)}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Remaining</span>
                                                    <span style={{ color: m.total_remaining > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>{formatCurrency(m.total_remaining)}</span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.5rem', flex: 1, justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); exportSingleMemberSummary(m.member_id, m.name); }}
                                                    className="btn"
                                                    title="Export Member CSV"
                                                    style={{ padding: '0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <a
                                                    href={`/api/pdf/${run.id}/${m.member_id}`}
                                                    download
                                                    className="btn"
                                                    title="Download Salary Slip"
                                                    style={{ padding: '0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <FileText size={16} color="var(--primary)" />
                                                </a>
                                                {!isFinal && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleOpenAdjustment(m.member_id); }}
                                                        disabled={loading}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                                                        title="Adjust Payment"
                                                    >
                                                        <Edit3 size={16} /> Adjust
                                                    </button>
                                                )}
                                                {!isFinal && m.total_remaining > 0 && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); markMemberFullyPaid(m.member_id); }}
                                                        disabled={loading}
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                                                    >
                                                        Mark All Paid
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Accordion Body */}
                                        {isExpanded && (
                                            <div style={{ padding: '0' }}>
                                                {m.records.length === 0 ? (
                                                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>No websites found for this member.</div>
                                                ) : (
                                                    <div style={{ overflowX: 'auto' }}>
                                                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                                                            <thead>
                                                                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem' }}>Site</th>
                                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem' }}>USD Share</th>
                                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem' }}>%</th>
                                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem' }}>Payable PKR</th>
                                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem' }}>Paid PKR</th>
                                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem' }}>Remaining</th>
                                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.875rem' }}>Action</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {m.records.map((r: any) => renderSiteRow(r))}
                                                            </tbody>
                                                        </table>

                                                        {m.adjustments && m.adjustments.length > 0 && (
                                                            <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                                                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Adjustments Summary</h4>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                                    {m.adjustments.map((adj: any) => (
                                                                        <div key={adj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--card)', padding: '0.75rem 1rem', borderRadius: '0.25rem', border: '1px dashed var(--border)' }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                                                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                                                                    {adj.type === 'Bonus' && <span style={{ color: 'var(--success)' }}>+</span>}
                                                                                    {adj.type === 'Extra Payment' && <span style={{ color: 'var(--primary)' }}>+</span>}
                                                                                    {adj.type === 'Deduction' && <span style={{ color: 'var(--danger)' }}>-</span>}
                                                                                    {adj.type === 'Manual Override' && <span style={{ color: 'var(--text-muted)' }}>(Override)</span>}
                                                                                    {' '}₨ {adj.amount.toLocaleString()}{' '}
                                                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({adj.type})</span>
                                                                                </div>
                                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{adj.note}</span>
                                                                            </div>
                                                                            {!isFinal && (
                                                                                <button
                                                                                    onClick={() => handleDeleteAdjustment(adj.id)}
                                                                                    disabled={loading}
                                                                                    style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                                                                                >
                                                                                    <Trash2 size={16} />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}

            {/* SITE VIEW */}
            {viewMode === 'site' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1rem', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Member Summary</h2>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <a href={`/api/pdf/${run.id}/bulk`} download className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem' }}>
                                <FileText size={16} /> Download All Slips (ZIP)
                            </a>
                            <button onClick={exportMemberSummary} className="btn" style={{ display: 'flex', gap: '0.5rem', background: 'var(--card)', border: '1px solid var(--border)' }}>
                                <Download size={16} /> Export CSV
                            </button>
                        </div>
                    </div>
                    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Member Name</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Total USD Share</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Total Payable</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Total Paid</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Remaining</th>
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {memberSummary.map(m => (
                                    <tr key={m.member_id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{m.name}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--success)', fontWeight: 500 }}>{formatUSD(m.total_usd_share)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(m.total_payable)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--primary)' }}>{formatCurrency(m.total_paid)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right', color: m.total_remaining > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                            {formatCurrency(m.total_remaining)}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <a
                                                    href={`/api/pdf/${run.id}/${m.member_id}`}
                                                    download
                                                    className="btn"
                                                    title="Download Salary Slip"
                                                    style={{ padding: '0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                                                >
                                                    <FileText size={16} color="var(--primary)" />
                                                </a>
                                                <button
                                                    onClick={() => markMemberFullyPaid(m.member_id)}
                                                    disabled={loading || m.total_remaining <= 0 || isFinal}
                                                    className="btn"
                                                    style={{ padding: '0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                                                >
                                                    Mark All Paid
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>


                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2rem', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Site-wise Breakdown</h2>
                        <button onClick={exportSiteWise} className="btn" style={{ display: 'flex', gap: '0.5rem', background: 'var(--card)', border: '1px solid var(--border)' }}>
                            <Download size={16} /> Export CSV
                        </button>
                    </div>
                    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>Site</th>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>Member</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>USD</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Rate</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Total PKR</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>%</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Payable PKR</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Paid PKR</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Remaining</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {run.records.map((r: any) => renderSiteRow(r))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
