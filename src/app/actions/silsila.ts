"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAction } from "./audit";

export async function getRecipients() {
    return prisma.silsilaRecipient.findMany({
        orderBy: { createdAt: "asc" }
    });
}

export async function saveRecipient(data: FormData) {
    const id = data.get("id") as string;
    const name = data.get("name") as string;
    const category = data.get("category") as string;
    const phone = data.get("phone") as string;
    const default_shareStr = data.get("default_share") as string;
    const fixed_amountStr = data.get("fixed_amount") as string;

    const default_share = default_shareStr ? parseFloat(default_shareStr) : null;
    const fixed_amount = fixed_amountStr ? parseFloat(fixed_amountStr) : null;

    if (id) {
        await prisma.silsilaRecipient.update({
            where: { id },
            data: { name, category, phone, default_share, fixed_amount }
        });
        await logAction({
            action_type: "SILSILA_UPDATE",
            entity_type: "Recipient",
            entity_id: id,
            details: { name, category }
        });
    } else {
        const created = await prisma.silsilaRecipient.create({
            data: { name, category, phone, default_share, fixed_amount }
        });
        await logAction({
            action_type: "SILSILA_CREATE",
            entity_type: "Recipient",
            entity_id: created.id,
            details: { name, category }
        });
    }

    revalidatePath("/silsila");
    revalidatePath("/silsila/recipients");
    return { success: true };
}

export async function deleteRecipient(id: string) {
    await prisma.silsilaRecipient.delete({ where: { id } });
    revalidatePath("/silsila");
    revalidatePath("/silsila/recipients");
    return { success: true };
}

export async function getSilsilaMonthData(month: string) {
    // 1. Get settings
    const settings = await prisma.settings.findFirst();
    if (!settings || !settings.silsila_enabled) {
        return { enabled: false };
    }

    const finance: any = await prisma.financeRecord.findUnique({
        where: { month },
        include: { expenses: true } as any
    });

    const payrollRun: any = await prisma.payrollRun.findUnique({
        where: { month },
        include: { records: true, adjustments: true } as any
    });

    let bank_received_pkr = finance?.bank_received || 0;
    let bank_tax_pkr = finance?.bank_tax || 0;
    let net_after_tax = finance?.net_after_tax || (bank_received_pkr - bank_tax_pkr);

    let total_salaries_paid_pkr = 0;
    if (payrollRun) {
        const memberMap = new Map();
        for (const r of payrollRun.records) {
            if (!memberMap.has(r.member_id)) {
                memberMap.set(r.member_id, { paid: 0 });
            }
            memberMap.get(r.member_id).paid += r.paid_pkr;
        }

        if (payrollRun.adjustments) {
            for (const adj of payrollRun.adjustments as any[]) {
                if (!memberMap.has(adj.member_id)) continue;
                const m = memberMap.get(adj.member_id);
                if (adj.type === 'Extra Payment') m.paid += adj.amount;
                if (adj.type === 'Manual Override') m.paid = adj.amount;
            }
        }

        for (const m of Array.from(memberMap.values())) {
            total_salaries_paid_pkr += m.paid;
        }
    }

    let server_costs_pkr = 0;
    let other_expenses_pkr = 0;
    if (finance && finance.expenses) {
        finance.expenses.forEach((e: any) => {
            if (['Hosting', 'VPS', 'Domain', 'CDN'].includes(e.expense_type)) {
                server_costs_pkr += e.amount;
            } else {
                other_expenses_pkr += e.amount;
            }
        });
    }

    const final_net = net_after_tax - total_salaries_paid_pkr - server_costs_pkr - other_expenses_pkr;

    const silsilaPercentage = settings.silsila_percentage;
    let silsilaTotal = 0;

    if (final_net > 0) {
        const exactAllocation = final_net * (silsilaPercentage / 100);
        silsilaTotal = Math.round(exactAllocation * 100) / 100;
    }

    // 3. Get or Create distributions for this month
    let distributions = await prisma.silsilaDistribution.findMany({
        where: { month },
        include: { recipient: true }
    });

    // Check if new recipients exist that need distributions
    const recipients = await prisma.silsilaRecipient.findMany();
    const existingRecipientIds = distributions.map(d => d.recipient_id);

    const missingRecipients = recipients.filter(r => !existingRecipientIds.includes(r.id));

    if (missingRecipients.length > 0) {
        // Create initial distributions for missing recipients
        const newDistributions = missingRecipients.map(r => {
            let allocated_amount_pkr = 0;
            if (r.fixed_amount) {
                allocated_amount_pkr = r.fixed_amount;
            } else if (r.default_share) {
                allocated_amount_pkr = (silsilaTotal * r.default_share) / 100;
            }

            return {
                month,
                recipient_id: r.id,
                allocated_amount_pkr,
                paid_amount_pkr: 0,
                status: "PENDING"
            };
        });

        await (prisma.silsilaDistribution as any).createMany({
            data: newDistributions
        });

        // re-fetch distributions
        distributions = await (prisma.silsilaDistribution as any).findMany({
            where: { month },
            include: { recipient: true },
            orderBy: { recipient: { name: 'asc' } }
        });
    }

    const totalDistributed = distributions.reduce((sum, d: any) => sum + d.paid_amount_pkr, 0);
    const remainingBalance = silsilaTotal - totalDistributed;

    return {
        enabled: true,
        baseAmount: final_net, // final_net serves as the base
        silsilaPercentage,
        silsilaTotal,
        totalDistributed,
        remainingBalance,
        distributions
    };
}

export async function updateDistribution(id: string, allocated_amount_pkr: number, paid_amount_pkr: number, status: string, notes: string | null = null, payment_date: string | null = null) {
    const updated: any = await (prisma.silsilaDistribution as any).update({
        where: { id },
        data: {
            allocated_amount_pkr,
            paid_amount_pkr,
            status,
            notes,
            payment_date: payment_date ? new Date(payment_date) : null
        }
    });

    if (status === "PAID") {
        await logAction({
            action_type: "SILSILA_PAY",
            entity_type: "Distribution",
            entity_id: id,
            month: updated.month,
            details: { allocated_amount_pkr, paid_amount_pkr, status }
        });
    } else {
        await logAction({
            action_type: "SILSILA_UPDATE",
            entity_type: "Distribution",
            entity_id: id,
            month: updated.month,
            details: { allocated_amount_pkr, paid_amount_pkr, status }
        });
    }

    revalidatePath("/silsila/[month]", "page");
    return { success: true };
}
