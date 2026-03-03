import { getWebsites, getMembers } from "@/app/actions/member";
import WebsitesClient from "./WebsitesClient";
import WebsitesToolbar from "./WebsitesToolbar";

export const metadata = {
    title: "Websites | Payroll Manager",
};

export default async function WebsitesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    let websites = await getWebsites();
    const members = await getMembers();

    const resolvedSearchParams = await searchParams;

    const q = (typeof resolvedSearchParams?.q === 'string' ? resolvedSearchParams.q : '').toLowerCase();
    const sort = typeof resolvedSearchParams?.sort === 'string' ? resolvedSearchParams.sort : 'domain_asc';
    const active = resolvedSearchParams?.active === '1';
    const unassigned = resolvedSearchParams?.unassigned === '1';
    const percentZero = resolvedSearchParams?.percentZero === '1';

    // Filters
    if (q) {
        websites = websites.filter(w =>
            w.website_name.toLowerCase().includes(q) ||
            (w.member?.full_name?.toLowerCase().includes(q))
        );
    }
    if (active) {
        websites = websites.filter(w => w.status === 'active');
    }
    if (unassigned) {
        // member is null OR member name equals "Unassigned"
        websites = websites.filter(w => !w.member_id || w.member?.full_name === 'Unassigned');
    }
    if (percentZero) {
        websites = websites.filter(w => w.percentage_share === 0);
    }

    // Sort
    websites.sort((a, b) => {
        if (sort === 'domain_asc') {
            return a.website_name.localeCompare(b.website_name);
        } else if (sort === 'domain_desc') {
            return b.website_name.localeCompare(a.website_name);
        } else if (sort === 'percent_desc') {
            return b.percentage_share - a.percentage_share;
        } else if (sort === 'percent_asc') {
            return a.percentage_share - b.percentage_share;
        } else if (sort === 'member_asc') {
            const memberA = a.member?.full_name || 'Unassigned';
            const memberB = b.member?.full_name || 'Unassigned';
            if (memberA === 'Unassigned' && memberB !== 'Unassigned') return 1;
            if (memberB === 'Unassigned' && memberA !== 'Unassigned') return -1;
            return memberA.localeCompare(memberB);
        } else if (sort === 'member_desc') {
            const memberA = a.member?.full_name || 'Unassigned';
            const memberB = b.member?.full_name || 'Unassigned';
            if (memberA === 'Unassigned' && memberB !== 'Unassigned') return 1;
            if (memberB === 'Unassigned' && memberA !== 'Unassigned') return -1;
            return memberB.localeCompare(memberA);
        }
        return 0;
    });

    return (
        <div>
            <WebsitesToolbar />
            <WebsitesClient initialWebsites={websites} members={members} showUnassignedOverride={unassigned} />
        </div>
    );
}
