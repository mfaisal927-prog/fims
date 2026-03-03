"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAction } from "./audit";

function cleanDomain(url: string) {
    let domain = url.trim().toLowerCase();
    domain = domain.replace(/^https?:\/\//, '');
    domain = domain.replace(/^www\./, '');
    domain = domain.replace(/\/.*$/, ''); // remove path
    return domain;
}

export type WebSitePayload = {
    id?: string;
    website_name: string;
    percentage_share: number;
    status: string;
}

export async function getMembers() {
    return prisma.member.findMany({
        include: {
            _count: {
                select: { websites: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function getMember(id: string) {
    if (id === 'new') return null;
    return prisma.member.findUnique({
        where: { id },
        include: { websites: true }
    });
}

export async function saveMember(data: FormData) {
    const isEdit = data.get('id') !== 'new' && !!data.get('id');
    const id = data.get('id') as string;
    const full_name = data.get('full_name') as string;
    const details = data.get('details') as string;
    const phone_email = data.get('phone_email') as string;
    const status = data.get('status') as string;

    // Websites payload as JSON
    const websitesJson = data.get('websites') as string;
    let websites: WebSitePayload[] = websitesJson ? JSON.parse(websitesJson) : [];

    // Clean and validate websites
    for (let w of websites) {
        w.website_name = cleanDomain(w.website_name);
        if (!w.website_name) {
            return { error: 'Website name cannot be empty.' };
        }
        if (w.percentage_share < 0 || w.percentage_share > 100) {
            return { error: `Percentage must be 0-100 for ${w.website_name}.` };
        }
    }

    // Check for uniqueness across ALL members for these websites
    const domainNames = websites.map(w => w.website_name);
    if (domainNames.length > new Set(domainNames).size) {
        return { error: 'You have duplicate websites in this form.' };
    }

    const existingWebsites = await prisma.website.findMany({
        where: {
            website_name: { in: domainNames },
            ...(isEdit ? { member_id: { not: id } } : {}) // ignore same member in edit
        }
    });

    if (existingWebsites.length > 0) {
        return { error: `The following websites already belong to other members: ${existingWebsites.map((w: any) => w.website_name).join(', ')}` };
    }

    try {
        if (isEdit) {
            // Get current member's websites so we know which ones to delete
            const memberWebsites = await prisma.website.findMany({ where: { member_id: id } });

            // Separate actions
            const incomingIds = websites.map((w: WebSitePayload) => w.id).filter(Boolean) as string[];
            const toDelete = memberWebsites.filter((w: any) => !incomingIds.includes(w.id));

            await prisma.$transaction([
                ...toDelete.map((w: any) => prisma.website.delete({ where: { id: w.id } })),
                prisma.member.update({
                    where: { id },
                    data: {
                        full_name, details, phone_email, status,
                        websites: {
                            upsert: websites.map((w: WebSitePayload) => ({
                                where: { id: w.id || 'new-uuid-that-does-not-exist' }, // Prisma requires valid string if using cuid/uuid, or just omit if no ID, wait upsert needs a real where. If w.id missing, upsert where can fail.
                                update: {
                                    website_name: w.website_name,
                                    percentage_share: Number(w.percentage_share),
                                    status: w.status
                                },
                                create: {
                                    website_name: w.website_name,
                                    percentage_share: Number(w.percentage_share),
                                    status: w.status
                                }
                            }))
                        }
                    }
                })
            ]);
        } else {
            // New member
            await prisma.member.create({
                data: {
                    full_name, details, phone_email, status,
                    websites: {
                        create: websites.map((w: WebSitePayload) => ({
                            website_name: w.website_name,
                            percentage_share: Number(w.percentage_share),
                            status: w.status
                        }))
                    }
                }
            });
        }
    } catch (err: any) {
        if (err.code === 'P2002') return { error: 'A website name must be globally unique.' };
        return { error: err.message || 'An unknown error occurred.' };
    }

    await logAction({
        action_type: isEdit ? 'UPDATE_MEMBER' : 'CREATE_MEMBER',
        entity_type: 'Member',
        entity_id: id,
        details: { full_name, website_count: websites.length }
    });

    revalidatePath('/members');
    revalidatePath('/websites');
    return { success: true };
}

export async function deleteMember(data: FormData) {
    const id = data.get('id') as string;
    await prisma.member.delete({
        where: { id }
    });

    await logAction({
        action_type: 'DELETE_MEMBER',
        entity_type: 'Member',
        entity_id: id
    });

    revalidatePath('/members');
    revalidatePath('/websites');
}

export async function getWebsites() {
    return prisma.website.findMany({
        include: {
            member: {
                select: { full_name: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function assignWebsite(websiteId: string, memberId: string, percentage: number) {
    if (percentage < 0 || percentage > 100) return { error: "Percentage must be 0-100" };
    if (!memberId) return { error: "Please select a member" };

    await prisma.website.update({
        where: { id: websiteId },
        data: {
            member_id: memberId,
            percentage_share: percentage
        }
    });

    await logAction({
        action_type: 'UPDATE_WEBSITE',
        entity_type: 'Website',
        entity_id: websiteId,
        details: { action: "Assigned member", member_id: memberId, percentage }
    });

    revalidatePath('/websites');
    return { success: true };
}

export async function checkDomainsOwnership(domains: string[], currentMemberId: string | null) {
    const existingWebsites = await prisma.website.findMany({
        where: {
            website_name: { in: domains },
            ...(currentMemberId && currentMemberId !== 'new' ? { member_id: { not: currentMemberId } } : {})
        },
        include: {
            member: { select: { full_name: true } }
        }
    });

    const ownership: Record<string, string> = {};
    existingWebsites.forEach(w => {
        if (w.member?.full_name) {
            ownership[w.website_name] = w.member.full_name;
        }
    });
    return ownership;
}

export async function getMemberPerformance(memberId: string) {
    if (memberId === 'new' || !memberId) return [];

    // get last 6 runs
    const recentRuns = await prisma.payrollRun.findMany({
        orderBy: { month: 'desc' },
        take: 6,
        select: { id: true, month: true }
    });

    if (!recentRuns.length) return [];

    const performanceData = [];

    // order chronologically for the graph
    const sortedRuns = [...recentRuns].sort((a, b) => a.month.localeCompare(b.month));

    for (const run of sortedRuns) {
        const aggr = await prisma.payrollRecord.aggregate({
            where: {
                member_id: memberId,
                payroll_run_id: run.id
            },
            _sum: {
                payable_pkr: true,
                paid_pkr: true,
                remaining_pkr: true
            }
        });

        performanceData.push({
            month: run.month,
            payable: Number(aggr._sum.payable_pkr || 0),
            paid: Number(aggr._sum.paid_pkr || 0),
            remaining: Number(aggr._sum.remaining_pkr || 0),
        });
    }

    return performanceData;
}
