"use server";

import prisma from "@/lib/prisma";

export async function getAlertsData(runId?: string) {
    if (!runId) {
        const latestRun = await prisma.payrollRun.findFirst({
            where: { status: 'final' },
            orderBy: { month: 'desc' }
        });
        if (!latestRun) return { run: null, alerts: [] };
        runId = latestRun.id;
    }

    const run = await prisma.payrollRun.findUnique({
        where: { id: runId }
    });

    if (!run) return { run: null, alerts: [] };

    const records = await prisma.payrollRecord.findMany({
        where: { payroll_run_id: runId },
        include: {
            member: {
                select: { id: true, full_name: true, phone_email: true }
            }
        }
    });

    const grouped: Record<string, any> = {};

    records.forEach(r => {
        if (!grouped[r.member_id]) {
            grouped[r.member_id] = {
                member: r.member,
                zeroEarning: [],
                lowEarning: [],
                remainingPkr: 0
            };
        }

        grouped[r.member_id].remainingPkr += r.remaining_pkr;

        if (r.usd_amount === 0) {
            grouped[r.member_id].zeroEarning.push({ site: r.site, usd: r.usd_amount });
        } else if (r.usd_amount < 10) {
            grouped[r.member_id].lowEarning.push({ site: r.site, usd: r.usd_amount });
        }
    });

    // filter to only members with alerts (zero, low, or high remaining)
    const alerts = Object.values(grouped).filter(g =>
        g.zeroEarning.length > 0 || g.lowEarning.length > 0 || g.remainingPkr >= 1000
    );

    // sort by member name
    alerts.sort((a, b) => a.member.full_name.localeCompare(b.member.full_name));

    return {
        run,
        alerts
    };
}
