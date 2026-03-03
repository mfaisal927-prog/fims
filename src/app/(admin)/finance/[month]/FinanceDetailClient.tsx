"use client";

import { useState } from "react";
import { updateBankReceived, addExpense, deleteExpense } from "@/app/actions/finance";
import { Trash2, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FinanceDetailClient({ record, payrollTotals }: any) {
    const router = useRouter();
    const [isSavingRecord, setIsSavingRecord] = useState(false);
    const [bankReceived, setBankReceived] = useState(record.bank_received.toString());
    const [bankTax, setBankTax] = useState(record.bank_tax.toString());
    const [bankTaxPercent, setBankTaxPercent] = useState(record.bank_tax_percent ? record.bank_tax_percent.toString() : "");
    const [isTaxPercent, setIsTaxPercent] = useState(!!record.bank_tax_percent);
    const [manualSalaryPaid, setManualSalaryPaid] = useState(record.manual_salary_paid_pkr ? record.manual_salary_paid_pkr.toString() : "");
    const [manualSalaryNote, setManualSalaryNote] = useState(record.manual_salary_note || "");
    const [isAddingManualSalary, setIsAddingManualSalary] = useState(false);
    const [recordNotes, setRecordNotes] = useState(record.notes || "");
    const [isAddingExpense, setIsAddingExpense] = useState(false);

    // New Expense State
    const [expenseType, setExpenseType] = useState("Hosting");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
    const [expenseNotes, setExpenseNotes] = useState("");

    const handleSaveRecord = async () => {
        setIsSavingRecord(true);
        const br = parseFloat(bankReceived) || 0;
        let tax = parseFloat(bankTax) || 0;
        let taxPercent = isTaxPercent && bankTaxPercent ? parseFloat(bankTaxPercent) : null;

        if (isTaxPercent && taxPercent) {
            tax = br * (taxPercent / 100);
        }

        const netAfterTax = br - tax;

        await updateBankReceived(record.id, {
            bank_received: br,
            bank_tax: tax,
            bank_tax_percent: taxPercent,
            net_after_tax: netAfterTax,
            manual_salary_paid_pkr: parseFloat(manualSalaryPaid) || 0,
            manual_salary_note: manualSalaryNote,
            notes: recordNotes
        });
        setIsSavingRecord(false);
        router.refresh();
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseAmount) return;
        setIsAddingExpense(true);
        await addExpense(record.id, {
            expense_type: expenseType,
            amount: parseFloat(expenseAmount),
            date: expenseDate,
            notes: expenseNotes
        });
        setExpenseAmount("");
        setExpenseNotes("");
        setIsAddingExpense(false);
        router.refresh();
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm("Delete this expense?")) return;
        await deleteExpense(id);
        router.refresh();
    };

    const serverCosts = record.expenses
        .filter((e: any) => ['Hosting', 'VPS', 'Domain', 'CDN'].includes(e.expense_type))
        .reduce((sum: number, e: any) => sum + e.amount, 0);

    const otherExpenses = record.expenses
        .filter((e: any) => !['Hosting', 'VPS', 'Domain', 'CDN'].includes(e.expense_type))
        .reduce((sum: number, e: any) => sum + e.amount, 0);

    const brAmount = parseFloat(bankReceived || "0");
    const taxAmount = isTaxPercent && parseFloat(bankTaxPercent || "0") ? (brAmount * (parseFloat(bankTaxPercent || "0") / 100)) : parseFloat(bankTax || "0");
    const netAfterTax = brAmount - taxAmount;

    // Display Salaries
    const mSalaryPaid = record.manual_salary_paid_pkr || 0;
    const finalDisplaySalariesPaid = payrollTotals.paid + mSalaryPaid;

    const finalNet = netAfterTax - finalDisplaySalariesPaid - serverCosts - otherExpenses;
    const silsilaAllocation = finalNet > 0 ? finalNet * 0.33 : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Top Summaries */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Bank Received</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--success)' }}>₨ {brAmount.toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Net After Tax: ₨ {netAfterTax.toLocaleString()}</div>
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Salaries Paid</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--danger)' }}>₨ {finalDisplaySalariesPaid.toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {payrollTotals.exists ? (
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>[Linked: YES]</span>
                        ) : (
                            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>[Linked: NO]</span>
                        )}
                        {' '} Payroll: ₨ {payrollTotals.paid.toLocaleString()}
                        {mSalaryPaid > 0 && ` | Manual: ₨ ${mSalaryPaid.toLocaleString()}`}
                    </div>
                    {payrollTotals.exists && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Payable: ₨ {payrollTotals.payable.toLocaleString()} | Remaining: ₨ {payrollTotals.remaining.toLocaleString()}
                        </div>
                    )}
                    {!payrollTotals.exists && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
                            No payroll found for this month.
                            <button onClick={() => router.push(`/payroll?month=${record.month}`)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', padding: 0, marginLeft: '4px' }}>Go to Payroll</button>
                        </div>
                    )}
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Expenses</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--danger)' }}>₨ {(serverCosts + otherExpenses).toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Server: ₨ {serverCosts.toLocaleString()} | Other: ₨ {otherExpenses.toLocaleString()}</div>
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: `2px solid ${finalNet >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Final Net Balance</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: finalNet >= 0 ? 'var(--success)' : 'var(--danger)' }}>₨ {finalNet.toLocaleString()}</div>
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '2px solid var(--primary)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Silsila Allocation (33%)</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--primary)' }}>₨ {silsilaAllocation.toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', color: finalNet > 0 ? 'var(--text-muted)' : 'var(--danger)' }}>
                        {finalNet > 0 ? 'Available for distribution' : 'No allocation (negative net)'}
                    </div>
                </div>
            </div>

            {isAddingManualSalary && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div className="card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Add Manual Salary</h3>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Use this to record extra salary payments made outside of the regular monthly payroll run.</p>

                        <div className="form-group">
                            <label>Amount (PKR)</label>
                            <input type="number" className="input" value={manualSalaryPaid} onChange={e => setManualSalaryPaid(e.target.value)} />
                        </div>

                        <div className="form-group">
                            <label>Note</label>
                            <input type="text" className="input" placeholder="e.g. Advance given" value={manualSalaryNote} onChange={e => setManualSalaryNote(e.target.value)} />
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button onClick={() => setIsAddingManualSalary(false)} className="btn" style={{ background: 'var(--background)' }}>Cancel</button>
                            <button onClick={() => { handleSaveRecord(); setIsAddingManualSalary(false); }} disabled={isSavingRecord} className="btn btn-primary">Save Salary</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'flex-start' }}>
                {/* Update Bank Received */}
                <div className="card">
                    <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Record Finance Info</h2>
                    <div className="form-group">
                        <label>Bank Received (PKR)</label>
                        <input
                            type="number"
                            min="0"
                            className="input"
                            value={bankReceived}
                            onChange={e => setBankReceived(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Bank Tax Deducted
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 'normal', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={isTaxPercent}
                                    onChange={e => setIsTaxPercent(e.target.checked)}
                                /> Use Percentage (%)
                            </label>
                        </label>
                        {isTaxPercent ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="input"
                                    placeholder="%"
                                    value={bankTaxPercent}
                                    onChange={e => setBankTaxPercent(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <span style={{ color: 'var(--text-muted)' }}>= ₨ {taxAmount.toLocaleString()}</span>
                            </div>
                        ) : (
                            <input
                                type="number"
                                min="0"
                                className="input"
                                placeholder="PKR"
                                value={bankTax}
                                onChange={e => setBankTax(e.target.value)}
                            />
                        )}
                    </div>

                    <div className="form-group">
                        <label>Notes (Optional)</label>
                        <textarea
                            className="input"
                            value={recordNotes}
                            onChange={e => setRecordNotes(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleSaveRecord}
                            disabled={isSavingRecord}
                            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                        >
                            <Save size={16} /> {isSavingRecord ? "Saving..." : "Save Finance Record"}
                        </button>

                        <button
                            className="btn btn-secondary"
                            onClick={() => setIsAddingManualSalary(true)}
                            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem' }}
                        >
                            <Plus size={16} /> Add Manual Salary
                        </button>
                    </div>
                </div>

                {/* Add Expense */}
                <div className="card">
                    <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Add Expense</h2>
                    <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Expense Type</label>
                                <select className="input" value={expenseType} onChange={e => setExpenseType(e.target.value)}>
                                    <option>Hosting</option>
                                    <option>VPS</option>
                                    <option>Domain</option>
                                    <option>CDN</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Amount (PKR)</label>
                                <input required type="number" className="input" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Date</label>
                            <input required type="date" className="input" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Notes</label>
                            <input type="text" className="input" value={expenseNotes} onChange={e => setExpenseNotes(e.target.value)} />
                        </div>
                        <button type="submit" className="btn btn-secondary" disabled={isAddingExpense} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                            <Plus size={16} /> Add Expense
                        </button>
                    </form>
                </div>
            </div>

            {/* Expenses List */}
            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                    <h2 style={{ fontSize: '1.25rem' }}>Expense Breakdown</h2>
                </div>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Type</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Notes</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Amount</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {record.expenses.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No expenses added yet.
                                </td>
                            </tr>
                        ) : (
                            record.expenses.map((expense: any) => (
                                <tr key={expense.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem' }}>{new Date(expense.date).toISOString().slice(0, 10)}</td>
                                    <td style={{ padding: '1rem', fontWeight: 600 }}>{expense.expense_type}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{expense.notes || '-'}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--danger)', fontWeight: 'bold' }}>
                                        ₨ {expense.amount.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <button
                                            className="btn"
                                            onClick={() => handleDeleteExpense(expense.id)}
                                            style={{ color: 'var(--danger)', background: 'transparent', padding: '0.5rem', cursor: 'pointer', border: 'none' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
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
