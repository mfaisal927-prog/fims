"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAction } from "./audit";

export async function addAdjustment(
    payroll_run_id: string,
    member_id: string,
    type: string,
    amount: number,
    note: string
) {
    const run = await prisma.payrollRun.findUnique({ where: { id: payroll_run_id } });
    if (!run || run.status === "final") return { error: "Payroll run not found or finalized" };

    const adj = await prisma.payrollAdjustment.create({
        data: {
            payroll_run_id,
            member_id,
            type,
            amount,
            note
        }
    });

    await logAction({
        action_type: 'ADJUSTMENT_ADD',
        entity_type: 'PayrollAdjustment',
        entity_id: adj.id,
        month: run.month,
        details: { type, amount, note }
    });

    revalidatePath(`/payroll/${payroll_run_id}`);
    revalidatePath('/payroll');
    return { success: true };
}

export async function deleteAdjustment(id: string) {
    // Because Prisma doesn't have PayrollAdjustment generated yet in the current Next.js TS language server context,
    // we use prisma as any to bypass TS error. Once server restarts and client is generated, it will work.
    const prismaClient = prisma as any;

    const adj = await prismaClient.payrollAdjustment.findUnique({ where: { id }, include: { payrollRun: true } });
    if (!adj || adj.payrollRun.status === "final") return { error: "Not found or finalized" };

    await prismaClient.payrollAdjustment.delete({ where: { id } });

    await logAction({
        action_type: 'ADJUSTMENT_DELETE',
        entity_type: 'PayrollAdjustment',
        entity_id: id,
        month: adj.payrollRun.month,
        details: { type: adj.type, amount: adj.amount }
    });

    revalidatePath(`/payroll/${adj.payroll_run_id}`);
    revalidatePath('/payroll');
    return { success: true };
}
