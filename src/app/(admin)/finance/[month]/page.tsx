import { getOrCreateFinanceRecord } from "@/app/actions/finance";
import prisma from "@/lib/prisma";
import FinanceDetailClient from "./FinanceDetailClient";
import Link from "next/link";
import { ArrowLeft, Copy } from "lucide-react";
import FinanceMonthSwitch from "./FinanceMonthSwitch";
import { revalidatePath } from "next/cache";

export default async function FinanceDetailPage({ params }: { params: Promise<{ month: string }> }) {
    const { month } = await params;
    const financeRecord = await getOrCreateFinanceRecord(month);

    async function handleDuplicate() {
        "use server";
        const [y, m] = month.split('-');
        let prevDate = new Date(parseInt(y), parseInt(m) - 1, 1);
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevMonthStr = prevDate.toISOString().slice(0, 7);

        const prevRecord = await prisma.financeRecord.findUnique({
            where: { month: prevMonthStr },
            include: { expenses: true }
        });

        if (prevRecord) {
            for (const exp of prevRecord.expenses) {
                if (['Hosting', 'VPS', 'Domain', 'CDN'].includes(exp.expense_type)) {
                    await prisma.expense.create({
                        data: {
                            finance_record_id: financeRecord.id,
                            expense_type: exp.expense_type,
                            amount: exp.amount,
                            date: new Date(),
                            notes: exp.notes ? `(Copied) ${exp.notes}` : "(Copied from previous month)"
                        }
                    });
                }
            }
            revalidatePath(`/finance/${month}`);
        }
    }

    // Auto-linked payroll run for this month
    const payrollRun: any = await prisma.payrollRun.findUnique({
        where: { month },
        include: {
            records: true,
            adjustments: true
        } as any
    });

    let payrollTotals = {
        payable: 0,
        paid: 0,
        remaining: 0,
        exists: !!payrollRun
    };

    if (payrollRun) {
        let totalPayable = payrollRun.records.reduce((acc: number, r: any) => acc + (r.payable_pkr || 0), 0);
        let totalPaid = payrollRun.records.reduce((acc: number, r: any) => acc + (r.paid_pkr || 0), 0);

        // Include Adjustments in the totals
        if (payrollRun.adjustments) {
            payrollRun.adjustments.forEach((adj: any) => {
                if (adj.type === 'Bonus') {
                    totalPayable += adj.amount;
                } else if (adj.type === 'Deduction') {
                    totalPayable -= adj.amount;
                } else if (adj.type === 'Extra Payment') {
                    totalPaid += adj.amount;
                } else if (adj.type === 'Manual Override') {
                    // Manual Override logic might be tricky to apply globally without member grouping, 
                    // but since paid amount in Finance is an aggregate, we'll assume Manual Override 
                    // replaced the paid amount already in the `record` for simplicity, OR we can recalculate:
                    // Here we will just calculate using the exact same logic as PayrollDetailsClient 
                    // for precision.
                }
            });
        }

        // Exact recalculation by member to be 100% accurate
        let calcPayable = 0;
        let calcPaid = 0;

        const memberMap = new Map();
        for (const r of payrollRun.records) {
            if (!memberMap.has(r.member_id)) {
                memberMap.set(r.member_id, { payable: 0, paid: 0 });
            }
            const m = memberMap.get(r.member_id);
            m.payable += r.payable_pkr;
            m.paid += r.paid_pkr;
        }

        if (payrollRun.adjustments) {
            for (const adj of payrollRun.adjustments) {
                if (!memberMap.has(adj.member_id)) continue;
                const m = memberMap.get(adj.member_id);
                if (adj.type === 'Bonus') m.payable += adj.amount;
                if (adj.type === 'Deduction') m.payable -= adj.amount;
                if (adj.type === 'Extra Payment') m.paid += adj.amount;
                if (adj.type === 'Manual Override') m.paid = adj.amount; // Sets total paid
            }
        }

        for (const m of Array.from(memberMap.values())) {
            calcPayable += m.payable;
            calcPaid += m.paid;
        }

        payrollTotals.payable = calcPayable;
        payrollTotals.paid = calcPaid;
        payrollTotals.remaining = calcPayable - calcPaid;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link href="/finance" className="btn" style={{ padding: '0.4rem 0.5rem', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                        <ArrowLeft size={18} />
                    </Link>
                    <h1 style={{ margin: 0 }}>Finance: {month}</h1>
                    {financeRecord.expenses.length === 0 && (
                        <form action={handleDuplicate}>
                            <button type="submit" className="btn btn-secondary" style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', display: 'flex', gap: '0.2rem', alignItems: 'center' }} title="Copy server costs from previous month">
                                <Copy size={14} /> Duplicate Previous Expenses
                            </button>
                        </form>
                    )}
                </div>
                <div>
                    <FinanceMonthSwitch currentMonth={month} />
                </div>
            </div>

            <FinanceDetailClient
                record={financeRecord}
                payrollTotals={payrollTotals}
            />
        </div>
    );
}
