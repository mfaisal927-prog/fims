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

export type InitialDataRow = {
    member_full_name?: string;
    member_phone?: string;
    member_details?: string;
    member_status?: string;
    website_name?: string;
    website_percentage?: string | number;
    website_status?: string;
    note?: string;
};

export async function processInitialImport(rows: InitialDataRow[]) {
    let membersCreated = 0;
    let membersUpdated = 0;
    let websitesCreated = 0;
    const skippedDuplicates: string[] = [];
    const errors: { rowIdx: number, message: string }[] = [];

    // Use a map to track members locally within the loop
    const memberMap = new Map<string, string>(); // fullname(lowercase) -> id

    // Load existing members
    const existingMembers = await prisma.member.findMany();
    for (const m of existingMembers) {
        memberMap.set(m.full_name.trim().toLowerCase(), m.id);
    }

    // Load existing websites to quickly check duplicates without hitting db on every row
    const existingWebsites = await prisma.website.findMany({ select: { website_name: true } });
    const knownDomains = new Set(existingWebsites.map(w => w.website_name));

    let index = 0;
    for (const row of rows) {
        index++;

        // Validate minimal requirements
        if (!row.member_full_name?.trim()) {
            errors.push({ rowIdx: index, message: 'Missing member_full_name' });
            continue;
        }

        if (!row.website_name?.trim()) {
            errors.push({ rowIdx: index, message: 'Missing website_name' });
            continue;
        }

        const memberName = row.member_full_name.trim();
        const cleanNameKey = memberName.toLowerCase();

        const cleanSite = cleanDomain(row.website_name);
        if (!cleanSite) {
            errors.push({ rowIdx: index, message: 'Invalid website_name after cleaning' });
            continue;
        }

        // 1. Is this website already in the database/processed?
        if (knownDomains.has(cleanSite)) {
            skippedDuplicates.push(cleanSite);
            continue;
        }

        let percentage = Number(row.website_percentage);
        if (isNaN(percentage)) percentage = 0;
        if (percentage < 0) percentage = 0;
        if (percentage > 100) percentage = 100;

        const webStatus = (row.website_status?.trim().toLowerCase() === 'inactive') ? 'inactive' : 'active';
        const memStatus = (row.member_status?.trim().toLowerCase() === 'inactive') ? 'inactive' : 'active';

        try {
            let memberId = memberMap.get(cleanNameKey);

            if (!memberId) {
                // Create new member
                const m = await prisma.member.create({
                    data: {
                        full_name: memberName,
                        phone_email: row.member_phone?.trim() || null,
                        details: row.member_details?.trim() || null,
                        status: memStatus,
                    }
                });
                memberId = m.id;
                memberMap.set(cleanNameKey, m.id);
                membersCreated++;
            } else {
                // Optionially Update Member if details are passed but empty initially
                const existing = existingMembers.find(e => e.id === memberId);
                if (existing && (!existing.phone_email && row.member_phone?.trim())) {
                    await prisma.member.update({
                        where: { id: memberId },
                        data: { phone_email: row.member_phone.trim() }
                    });
                    membersUpdated++;
                }
            }

            // 2. Create Website
            await prisma.website.create({
                data: {
                    website_name: cleanSite,
                    percentage_share: percentage,
                    status: webStatus,
                    member_id: memberId
                }
            });
            knownDomains.add(cleanSite);
            websitesCreated++;

        } catch (err: any) {
            // In case of any concurrent inserts throwing uniqueness constraint error
            if (err.code === 'P2002') {
                knownDomains.add(cleanSite);
                skippedDuplicates.push(cleanSite);
            } else {
                errors.push({ rowIdx: index, message: `Database error: ${err.message}` });
            }
        }
    }

    await logAction({ action_type: 'INITIAL_IMPORT', entity_type: 'System', details: { websitesCreated, membersCreated, skippedDuplicates: skippedDuplicates.length } });

    revalidatePath('/members');
    revalidatePath('/websites');

    return {
        membersCreated,
        membersUpdated,
        websitesCreated,
        skippedDuplicates,
        errors
    };
}
