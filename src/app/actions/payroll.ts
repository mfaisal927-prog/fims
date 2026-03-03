"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAction } from "./audit";

function cleanDomain(url: string) {
    let domain = url.trim().toLowerCase();
    domain = domain.replace(/^https?:\/\//, '');
    domain = domain.replace(/^www\./, '');
    domain = domain.replace(/\/.*$/, ''); // remove path
    return domain;
}

export type CsvRow = {
    Site: string;
    Estimated: number;
};

export async function getPayrollRuns() {
    return prisma.payrollRun.findMany({
        include: {
            _count: {
                select: { records: true }
            }
        },
        orderBy: { month: 'desc' }
    });
}

export async function getPayrollRun(id: string) {
    return prisma.payrollRun.findUnique({
        where: { id },
        include: {
            records: {
                include: {
                    member: true,
                    website: true
                }
            },
            adjustments: true
        }
    });
}

export async function importPayrollData(
    month: string,
    usdToPkrRate: number,
    csvData: CsvRow[],
    replaceExisting: boolean = false
) {
    try {
        // 1. Process and normalize domains
        const processedData: { site: string; estimated: number }[] = [];

        // Aggregate if multiple rows map to the same domain in the CSV somehow
        const siteMap = new Map<string, number>();

        for (const row of csvData) {
            if (!row.Site || row.Estimated == null || isNaN(row.Estimated)) continue;
            const cleanSite = cleanDomain(row.Site);
            if (!cleanSite) continue;

            const current = siteMap.get(cleanSite) || 0;
            siteMap.set(cleanSite, current + Number(row.Estimated));
        }

        for (const [site, estimated] of Array.from(siteMap.entries())) {
            processedData.push({ site, estimated });
        }

        // 2. Fetch configured sites
        const domainsToLookUp = processedData.map(d => d.site);

        const knownWebsites = await prisma.website.findMany({
            where: {
                website_name: { in: domainsToLookUp },
                status: 'active',
                member_id: { not: null }
            },
            select: { id: true, website_name: true, member_id: true, percentage_share: true }
        });

        const knownDomains = knownWebsites.map(w => w.website_name);

        // 3. Find unmatched
        const unmatched = processedData.filter(d => !knownDomains.includes(d.site)).map(d => d.site);

        if (unmatched.length > 0) {
            return { unmatched: true, unmatchedList: unmatched };
        }

        // 4. Check if month exists
        const existingRun = await prisma.payrollRun.findUnique({ where: { month } });

        if (existingRun && !replaceExisting) {
            return { error: 'run_exists', message: `A payroll run for ${month} already exists. Do you want to replace it?` };
        }
        if (existingRun && existingRun.status === 'final') {
            return { error: 'locked', message: 'You cannot replace a finalized payroll run.' };
        }

        if (existingRun && replaceExisting) {
            const existingRecords = await prisma.payrollRecord.findMany({ where: { payroll_run_id: existingRun.id } });
            const transactions: any[] = [];

            transactions.push(prisma.payrollRun.update({
                where: { id: existingRun.id },
                data: { usd_to_pkr_rate: usdToPkrRate }
            }));

            for (const existing of existingRecords) {
                const csvMatch = processedData.find(d => d.site === existing.site);
                if (csvMatch) {
                    const totalPkr = csvMatch.estimated * usdToPkrRate;
                    const payablePkr = totalPkr * (existing.percentage / 100);
                    transactions.push(prisma.payrollRecord.update({
                        where: { id: existing.id },
                        data: {
                            usd_amount: csvMatch.estimated,
                            usd_rate: usdToPkrRate,
                            total_pkr: totalPkr,
                            payable_pkr: payablePkr,
                            remaining_pkr: payablePkr - existing.paid_pkr
                        }
                    }));
                } else {
                    // Not in CSV, set to 0
                    transactions.push(prisma.payrollRecord.update({
                        where: { id: existing.id },
                        data: {
                            usd_amount: 0,
                            usd_rate: usdToPkrRate,
                            total_pkr: 0,
                            payable_pkr: 0,
                            remaining_pkr: 0 - existing.paid_pkr
                        }
                    }));
                }
            }

            const newSites = processedData.filter(d => !existingRecords.some(r => r.site === d.site));
            if (newSites.length > 0) {
                const recordsToInsert = newSites.map(data => {
                    const website = knownWebsites.find(w => w.website_name === data.site)!;
                    const totalPkr = data.estimated * usdToPkrRate;
                    const payablePkr = totalPkr * (website.percentage_share / 100);
                    return {
                        payroll_run_id: existingRun.id,
                        member_id: website.member_id as string,
                        website_id: website.id,
                        site: data.site,
                        usd_amount: data.estimated,
                        usd_rate: usdToPkrRate,
                        total_pkr: totalPkr,
                        percentage: website.percentage_share,
                        payable_pkr: payablePkr,
                        paid_pkr: 0,
                        remaining_pkr: payablePkr
                    };
                });
                transactions.push(prisma.payrollRecord.createMany({ data: recordsToInsert }));
            }

            await prisma.$transaction(transactions);
            await logAction({ action_type: 'REPLACE', entity_type: 'PayrollRun', entity_id: existingRun.id, month });
            revalidatePath('/payroll');
            return { success: true, runId: existingRun.id };
        } else {
            // New Run Create mapping
            const recordsToCreate = processedData.map(data => {
                const website = knownWebsites.find(w => w.website_name === data.site)!;
                const totalPkr = data.estimated * usdToPkrRate;
                const payablePkr = totalPkr * (website.percentage_share / 100);

                return {
                    member_id: website.member_id as string,
                    website_id: website.id,
                    site: data.site,
                    usd_amount: data.estimated,
                    usd_rate: usdToPkrRate,
                    total_pkr: totalPkr,
                    percentage: website.percentage_share,
                    payable_pkr: payablePkr,
                    paid_pkr: 0,
                    remaining_pkr: payablePkr
                };
            });

            const newRun = await prisma.payrollRun.create({
                data: {
                    month,
                    usd_to_pkr_rate: usdToPkrRate,
                    records: {
                        create: recordsToCreate
                    }
                }
            });
            await logAction({ action_type: 'IMPORT', entity_type: 'PayrollRun', entity_id: newRun.id, month });
            revalidatePath('/payroll');
            return { success: true, runId: newRun.id };
        }
    } catch (err: any) {
        console.error("Monthly Earnings Import Error:", err);
        return { error: 'unknown', message: err.message || 'An error occurred during import' };
    }
}

export async function updatePaidAmount(recordId: string, paidAmount: number) {
    const record = await prisma.payrollRecord.findUnique({ where: { id: recordId }, include: { payrollRun: true } });
    if (!record) return { error: 'Record not found' };
    if (record.payrollRun.status === 'final') return { error: 'Cannot update paid amount for a finalized payroll run' };

    const remainingPkr = record.payable_pkr - paidAmount;

    await prisma.payrollRecord.update({
        where: { id: recordId },
        data: {
            paid_pkr: paidAmount,
            remaining_pkr: remainingPkr
        }
    });

    await logAction({ action_type: 'PAID_UPDATE', entity_type: 'PayrollRecord', entity_id: recordId, month: record.payrollRun.month, details: { old: record.paid_pkr, new: paidAmount } });

    revalidatePath(`/payroll/${record.payroll_run_id}`);
    return { success: true };
}

export async function markAllFullyPaidForMember(runId: string, memberId: string) {
    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run || run.status === 'final') return { error: 'Cannot update a finalized payroll run' };

    const records = await prisma.payrollRecord.findMany({
        where: { payroll_run_id: runId, member_id: memberId }
    });

    for (const record of records) {
        await prisma.payrollRecord.update({
            where: { id: record.id },
            data: {
                paid_pkr: record.payable_pkr,
                remaining_pkr: 0
            }
        });
        await logAction({ action_type: 'PAID_UPDATE', entity_type: 'PayrollRecord', entity_id: record.id, month: run.month, details: { old: record.paid_pkr, new: record.payable_pkr } });
    }

    revalidatePath(`/payroll/${runId}`);
    return { success: true };
}

export async function finalizePayroll(runId: string) {
    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) return { error: 'Not found' };
    if (run.status === 'final') return { error: 'Already finalized' };

    await prisma.payrollRun.update({
        where: { id: runId },
        data: {
            status: 'final',
            finalized_at: new Date()
        }
    });

    await logAction({ action_type: 'FINALIZE', entity_type: 'PayrollRun', entity_id: runId, month: run.month });
    revalidatePath(`/payroll/${runId}`);
    revalidatePath(`/payroll`);
    return { success: true };
}

export async function reopenPayroll(runId: string, reason: string) {
    if (!reason?.trim()) return { error: 'Reason is required' };

    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) return { error: 'Not found' };
    if (run.status !== 'final') return { error: 'Cannot reopen a draft run' };

    await prisma.payrollRun.update({
        where: { id: runId },
        data: {
            status: 'draft',
            reopened_at: new Date(),
            reopen_reason: reason
        }
    });

    await logAction({ action_type: 'REOPEN', entity_type: 'PayrollRun', entity_id: runId, month: run.month, details: { reason } });
    revalidatePath(`/payroll/${runId}`);
    revalidatePath(`/payroll`);
    return { success: true };
}

export async function clonePayrollRun(
    sourceRunId: string,
    newMonth: string,
    usdToPkrRate: number = 0,
    copyPaidAmounts: boolean = false
) {
    try {
        const existingRun = await prisma.payrollRun.findUnique({ where: { month: newMonth } });
        if (existingRun) {
            return { error: 'already_exists', message: `A payroll run for ${newMonth} already exists.` };
        }

        const sourceRun = await prisma.payrollRun.findUnique({
            where: { id: sourceRunId },
            include: { records: true }
        });

        if (!sourceRun) {
            return { error: 'not_found', message: 'Source payroll run not found.' };
        }

        const newRecords = sourceRun.records.map(r => {
            const paid = copyPaidAmounts ? r.paid_pkr : 0;
            return {
                member_id: r.member_id,
                website_id: r.website_id,
                site: r.site,
                usd_amount: 0,
                usd_rate: usdToPkrRate,
                total_pkr: 0,
                percentage: r.percentage,
                payable_pkr: 0,
                paid_pkr: paid,
                remaining_pkr: 0 - paid
            };
        });

        const newRun = await prisma.payrollRun.create({
            data: {
                month: newMonth,
                usd_to_pkr_rate: usdToPkrRate,
                status: 'draft',
                records: {
                    create: newRecords
                }
            }
        });

        await logAction({ action_type: 'CLONE_RUN', entity_type: 'PayrollRun', entity_id: newRun.id, month: newMonth, details: { sourceMonth: sourceRun.month } });
        if (copyPaidAmounts) {
            await logAction({ action_type: 'CLONE_RUN_COPY_PAID', entity_type: 'PayrollRun', entity_id: newRun.id, month: newMonth });
        }

        revalidatePath('/payroll');
        return { success: true, runId: newRun.id };
    } catch (err: any) {
        console.error("Clone Payroll Error:", err);
        return { error: 'unknown', message: err.message };
    }
}

export async function deletePayrollRun(runId: string) {
    try {
        const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
        if (!run) return { error: 'not_found', message: 'Payroll run not found' };

        if (run.status === 'final') {
            return { error: 'final', message: 'Cannot delete a finalized payroll run. Please reopen it first.' };
        }

        // Delete associated records first (if no cascade delete setup)
        await prisma.payrollRecord.deleteMany({
            where: { payroll_run_id: runId }
        });

        await prisma.payrollRun.delete({
            where: { id: runId }
        });

        await logAction({ action_type: 'DELETE', entity_type: 'PayrollRun', entity_id: runId, month: run.month });

        revalidatePath('/payroll');
        return { success: true };
    } catch (err: any) {
        console.error("Delete Payroll Error:", err);
        return { error: 'unknown', message: err.message };
    }
}
