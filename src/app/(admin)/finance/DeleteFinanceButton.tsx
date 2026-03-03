"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { deleteFinanceRecord } from "@/app/actions/finance";

export default function DeleteFinanceButton({
    month,
    hasPayroll,
    hasSilsila
}: {
    month: string;
    hasPayroll: boolean;
    hasSilsila: boolean;
}) {
    const [showModal, setShowModal] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (confirmText !== month) return;
        setIsDeleting(true);
        const res = await deleteFinanceRecord(month);
        if (res.success) {
            setShowModal(false);
        } else {
            alert(res.error);
        }
        setIsDeleting(false);
    };

    return (
        <>
            <button
                className="btn"
                onClick={() => setShowModal(true)}
                title="Delete Finance Record"
                style={{
                    padding: '0.4rem 0.5rem',
                    fontSize: '0.875rem',
                    display: 'inline-flex',
                    gap: '0.4rem',
                    justifyContent: 'center',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                }}
            >
                <Trash2 size={14} /> Delete
            </button>

            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '1rem'
                }}>
                    <div className="card" style={{ maxWidth: '400px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
                            <AlertTriangle /> Delete Finance Record?
                        </h2>

                        <p style={{ margin: 0 }}>
                            You are about to permanently delete Finance data for <b>{month}</b>.
                            This includes:
                        </p>
                        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-muted)' }}>
                            <li>Bank Received</li>
                            <li>Tax</li>
                            <li>Server Costs</li>
                            <li>Other Expenses</li>
                            <li>Silsila calculation</li>
                        </ul>
                        <p style={{ margin: 0, color: '#ef4444', fontWeight: 600 }}>This action cannot be undone.</p>

                        {hasPayroll && (
                            <div style={{ background: '#FFFBEB', color: '#B45309', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                                <strong>Warning:</strong> Payroll exists for this month. The dashboard will still show payroll, but finance overview will be empty.
                            </div>
                        )}

                        {hasSilsila && (
                            <div style={{ background: '#FFFBEB', color: '#B45309', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                                <strong>Warning:</strong> Silsila distributions already exist for {month}. Deleting finance will remove the base calculation they rely on.
                            </div>
                        )}

                        <div>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                                Type <strong>{month}</strong> to confirm:
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder={month}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button
                                className="btn"
                                onClick={() => setShowModal(false)}
                                style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleDelete}
                                disabled={confirmText !== month || isDeleting}
                                style={{ background: '#ef4444' }}
                            >
                                {isDeleting ? "Deleting..." : "Confirm Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
