"use client";

import { useState, useMemo } from "react";
import { Search, Info, Check } from "lucide-react";
import { assignWebsite } from "@/app/actions/member";

export default function WebsitesPageClient({ initialWebsites, members, showUnassignedOverride }: { initialWebsites: any[], members: any[], showUnassignedOverride?: boolean }) {
    const [loadingIds, setLoadingIds] = useState<string[]>([]);
    const [editData, setEditData] = useState<{ [key: string]: { member_id: string, percentage: string } }>({});

    const handleAssign = async (websiteId: string) => {
        const data = editData[websiteId];
        if (!data || !data.member_id || !data.percentage) return;

        setLoadingIds(prev => [...prev, websiteId]);

        try {
            const res = await assignWebsite(websiteId, data.member_id, Number(data.percentage));
            if (res.error) {
                alert(res.error);
            }
        } catch (e: any) {
            alert("Error assigning: " + e.message);
        } finally {
            setLoadingIds(prev => prev.filter(id => id !== websiteId));
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1>Websites</h1>
            </div>

            {showUnassignedOverride && (
                <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                    <div style={{ background: '#EFF6FF', color: '#1E3A8A', padding: '0.75rem 1rem', borderRadius: '0.375rem', fontSize: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Info size={16} />
                        These websites were imported but couldn't be automatically assigned to a member. Please assign them below to include them in future payrolls.
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Website Domain</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Assigned Member</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Percentage Share</th>
                            {!showUnassignedOverride && <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>}
                            {showUnassignedOverride && <th style={{ padding: '1rem', textAlign: 'center' }}>Action</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {initialWebsites.length === 0 ? (
                            <tr>
                                <td colSpan={showUnassignedOverride ? 4 : 4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No websites found matching your requirements.
                                </td>
                            </tr>
                        ) : (
                            initialWebsites.map(website => {
                                const isUnassigned = !website.member_id;
                                const isSaving = loadingIds.includes(website.id);

                                return (
                                    <tr key={website.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: isUnassigned ? '#FEF2F2' : 'transparent' }}>
                                        <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--primary)' }}>
                                            {website.website_name}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {isUnassigned ? (
                                                <select
                                                    className="form-control"
                                                    style={{ padding: '0.3rem', fontSize: '0.875rem' }}
                                                    value={editData[website.id]?.member_id || ""}
                                                    onChange={(e) => setEditData(prev => ({ ...prev, [website.id]: { ...prev[website.id], member_id: e.target.value } }))}
                                                >
                                                    <option value="">Select Member...</option>
                                                    {members.map(m => (
                                                        <option value={m.id} key={m.id}>{m.full_name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                website.member?.full_name || <span style={{ color: 'var(--danger)' }}>Unassigned</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>
                                            {isUnassigned ? (
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    placeholder="%"
                                                    style={{ width: '80px', margin: '0 auto', textAlign: 'center', padding: '0.3rem' }}
                                                    min="0" max="100"
                                                    value={editData[website.id]?.percentage || ""}
                                                    onChange={(e) => setEditData(prev => ({ ...prev, [website.id]: { ...prev[website.id], percentage: e.target.value } }))}
                                                />
                                            ) : (
                                                `${website.percentage_share}%`
                                            )}
                                        </td>

                                        {!showUnassignedOverride && (
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '0.25rem',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase',
                                                    backgroundColor: website.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                    color: website.status === 'active' ? 'var(--success)' : 'var(--danger)'
                                                }}>
                                                    {website.status}
                                                </span>
                                            </td>
                                        )}

                                        {showUnassignedOverride && (
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <button
                                                    className="btn btn-primary"
                                                    disabled={isSaving || !editData[website.id]?.member_id || !editData[website.id]?.percentage}
                                                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.875rem', display: 'flex', gap: '0.2rem', margin: '0 auto', alignItems: 'center' }}
                                                    onClick={() => handleAssign(website.id)}
                                                >
                                                    {isSaving ? 'Saving...' : <><Check size={14} /> Save</>}
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
