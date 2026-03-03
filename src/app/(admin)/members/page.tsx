import { getMembers, deleteMember } from "@/app/actions/member";
import Link from "next/link";
import { Edit, Plus } from "lucide-react";
import DeleteButton from "./DeleteButton";
import MembersToolbar from "./MembersToolbar";

export const metadata = {
    title: "Members | Payroll Manager",
};

export default async function MembersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    let members = await getMembers();
    const resolvedSearchParams = await searchParams;

    const q = (typeof resolvedSearchParams?.q === 'string' ? resolvedSearchParams.q : '').toLowerCase();
    const sort = typeof resolvedSearchParams?.sort === 'string' ? resolvedSearchParams.sort : 'name_asc';
    const active = resolvedSearchParams?.active === '1';
    const hasWebsites = resolvedSearchParams?.hasWebsites === '1';

    // Filters
    if (q) {
        members = members.filter(m =>
            m.full_name.toLowerCase().includes(q) ||
            (m.phone_email && m.phone_email.toLowerCase().includes(q))
        );
    }
    if (active) {
        members = members.filter(m => m.status === 'active');
    }
    if (hasWebsites) {
        members = members.filter(m => m._count.websites > 0);
    }

    // Sort
    members.sort((a, b) => {
        if (sort === 'name_asc') {
            return a.full_name.localeCompare(b.full_name);
        } else if (sort === 'name_desc') {
            return b.full_name.localeCompare(a.full_name);
        } else if (sort === 'websites_desc') {
            return b._count.websites - a._count.websites;
        } else if (sort === 'websites_asc') {
            return a._count.websites - b._count.websites;
        } else if (sort === 'status') {
            const aStatus = a.status === 'active' ? 1 : 0;
            const bStatus = b.status === 'active' ? 1 : 0;
            if (bStatus !== aStatus) return bStatus - aStatus;
            return a.full_name.localeCompare(b.full_name);
        }
        return 0;
    });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1>Members</h1>
                <Link href="/members/new" className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem' }}>
                    <Plus size={18} /> Add Member
                </Link>
            </div>
            <MembersToolbar />

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Next Name</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Phone/Email</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Websites</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No members found. Click "Add Member" to create one.
                                </td>
                            </tr>
                        ) : (
                            members.map((member: any) => (
                                <tr key={member.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{member.full_name}</td>
                                    <td style={{ padding: '1rem' }}>{member.phone_email || '-'}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <span style={{ background: 'var(--background)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                                            {member._count.websites}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.25rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            backgroundColor: member.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: member.status === 'active' ? 'var(--success)' : 'var(--danger)'
                                        }}>
                                            {member.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                            <Link href={`/members/${member.id}`} className="btn" style={{ padding: '0.5rem', backgroundColor: 'var(--background)' }}>
                                                <Edit size={16} />
                                            </Link>
                                            <form action={deleteMember}>
                                                <input type="hidden" name="id" value={member.id} />
                                                <DeleteButton />
                                            </form>
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
