"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAction } from "./audit";

export async function getFinanceRecords() {
    return prisma.financeRecord.findMany({
        where: { is_deleted: false },
        include: {
            expenses: true
        },
        orderBy: { month: 'desc' }
    });
}

export async function getOrCreateFinanceRecord(month: string) {
    let record = await prisma.financeRecord.findUnique({
        where: { month },
        include: { expenses: true }
    });

    if (!record || record.is_deleted) {
        record = await prisma.financeRecord.create({
            data: { month, bank_received: 0, is_deleted: false },
            include: { expenses: true }
        });
        await logAction({ action_type: 'FINANCE_CREATE', entity_type: 'FinanceRecord', entity_id: record.id, month });
    }

    return record;
}

export async function deleteFinanceRecord(month: string) {
    const record = await prisma.financeRecord.findUnique({
        where: { month }
    });

    if (!record) return { success: false, error: "Record not found" };

    await prisma.financeRecord.update({
        where: { id: record.id },
        data: {
            is_deleted: true,
            month: `${month}_deleted_${Date.now()}`
        }
    });

    await logAction({
        action_type: 'FINANCE_DELETE',
        entity_type: 'FinanceRecord',
        entity_id: record.id,
        month,
        details: { message: `Soft deleted finance record for ${month}` }
    });

    revalidatePath("/finance");
    revalidatePath(`/finance/${month}`);
    return { success: true };
}

export async function updateBankReceived(
    id: string,
    data: {
        bank_received: number,
        bank_tax: number,
        bank_tax_percent: number | null,
        net_after_tax: number,
        manual_salary_paid_pkr?: number,
        manual_salary_note?: string | null,
        notes: string | null
    }
) {
    const record = await prisma.financeRecord.update({
        where: { id },
        data: {
            bank_received: data.bank_received,
            bank_tax: data.bank_tax,
            bank_tax_percent: data.bank_tax_percent,
            net_after_tax: data.net_after_tax,
            manual_salary_paid_pkr: data.manual_salary_paid_pkr !== undefined ? data.manual_salary_paid_pkr : undefined,
            manual_salary_note: data.manual_salary_note !== undefined ? data.manual_salary_note : undefined,
            notes: data.notes
        }
    });

    await logAction({
        action_type: 'FINANCE_UPDATE',
        entity_type: 'FinanceRecord',
        entity_id: id,
        month: record.month,
        details: { bank_received: data.bank_received, bank_tax: data.bank_tax, net_after_tax: data.net_after_tax }
    });

    revalidatePath(`/finance/${record.month}`);
    revalidatePath('/finance');
    return { success: true };
}

export async function addExpense(finance_record_id: string, data: { expense_type: string, amount: number, date: string, notes: string | null }) {
    const record = await prisma.financeRecord.findUnique({ where: { id: finance_record_id } });
    if (!record) return { error: "Not found" };

    const expense = await prisma.expense.create({
        data: {
            finance_record_id,
            expense_type: data.expense_type,
            amount: data.amount,
            date: new Date(data.date),
            notes: data.notes
        }
    });

    await logAction({
        action_type: 'EXPENSE_ADD',
        entity_type: 'Expense',
        entity_id: expense.id,
        month: record.month,
        details: { amount: data.amount, type: data.expense_type }
    });

    revalidatePath(`/finance/${record.month}`);
    return { success: true };
}

export async function deleteExpense(id: string) {
    const expense = await prisma.expense.findUnique({ where: { id }, include: { financeRecord: true } });
    if (!expense) return { error: "Not found" };

    await prisma.expense.delete({ where: { id } });
    await logAction({
        action_type: 'EXPENSE_DELETE',
        entity_type: 'Expense',
        entity_id: id,
        month: expense.financeRecord.month,
        details: { amount: expense.amount, type: expense.expense_type }
    });

    revalidatePath(`/finance/${expense.financeRecord.month}`);
    return { success: true };
}
