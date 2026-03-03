import { getFinanceRecords } from "@/app/actions/finance";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Eye } from "lucide-react";
import FinanceMonthPicker from "./FinanceMonthPicker";
import DeleteFinanceButton from "./DeleteFinanceButton";

export const metadata = {
    title: "Monthly Finance | Payroll Manager",
};

export default async function FinancePage() {
    const records = await getFinanceRecords();

    const payrollRuns = await prisma.payrollRun.findMany({
        include: {
            records: true
        }
    });

    const silsilaDists = await prisma.silsilaDistribution.groupBy({
        by: ['month'],
        _count: {
            id: true
        }
    });

    const data = records.map((record: any) => {
        const prRun = payrollRuns.find((r: any) => r.month === record.month);
        const hasSilsila = silsilaDists.some(d => d.month === record.month && d._count.id > 0);
        const salariesPaid = prRun ? prRun.records.reduce((acc, r) => acc + r.paid_pkr, 0) : 0;

        let serverCosts = 0;
        let otherExpenses = 0;

        record.expenses.forEach((exp: any) => {
            if (['Hosting', 'VPS', 'Domain', 'CDN'].includes(exp.expense_type)) {
                serverCosts += exp.amount;
            } else {
                otherExpenses += exp.amount;
            }
        });

        // Compute net after tax to handle legacy records where it might be 0 but bank_received exists
        const netAfterTax = record.net_after_tax || (record.bank_received - record.bank_tax);
        const finalNet = netAfterTax - salariesPaid - serverCosts - otherExpenses;
        const silsilaAllocation = finalNet > 0 ? finalNet * 0.33 : 0;

        return {
            ...record,
            salariesPaid,
            serverCosts,
            otherExpenses,
            netAfterTax,
            finalNet,
            silsilaAllocation,
            hasPayroll: !!prRun,
            hasSilsila
        };
    });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1>Monthly Finance</h1>
                <FinanceMonthPicker />
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Month</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Bank Received</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Tax</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Net After Tax</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Salaries</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Server Costs</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Other Exp.</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Final Net</th>
                            <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--primary)' }}>Silsila (33%)</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No finance records found.
                                </td>
                            </tr>
                        ) : (
                            data.map((row: any) => (
                                <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 600 }}>{row.month}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--success)' }}>₨ {row.bank_received.toLocaleString()}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--danger)' }}>₨ {row.bank_tax.toLocaleString()}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--success)' }}>₨ {row.netAfterTax.toLocaleString()}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--danger)' }}>₨ {row.salariesPaid.toLocaleString()}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--danger)' }}>₨ {row.serverCosts.toLocaleString()}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--danger)' }}>₨ {row.otherExpenses.toLocaleString()}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: row.finalNet >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                        ₨ {row.finalNet.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>
                                        ₨ {row.silsilaAllocation.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            <Link href={`/finance/${row.month}`} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', display: 'inline-flex', gap: '0.4rem', justifyContent: 'center' }}>
                                                <Eye size={14} /> View
                                            </Link>
                                            <DeleteFinanceButton month={row.month} hasPayroll={row.hasPayroll} hasSilsila={row.hasSilsila} />
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
