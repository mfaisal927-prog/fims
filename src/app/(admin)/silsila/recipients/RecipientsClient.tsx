"use client";

import { useState } from "react";
import { saveRecipient, deleteRecipient } from "@/app/actions/silsila";
import { Edit2, Trash2, Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RecipientsClient({ initialData }: { initialData: any[] }) {
    const [recipients, setRecipients] = useState(initialData);
    const [isEditing, setIsEditing] = useState(false);
    const [currentRecipient, setCurrentRecipient] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleCreate = () => {
        setCurrentRecipient({ name: "", category: "Masjid", phone: "", default_share: "", fixed_amount: "" });
        setIsEditing(true);
    };

    const handleEdit = (rec: any) => {
        setCurrentRecipient({
            ...rec,
            default_share: rec.default_share || "",
            fixed_amount: rec.fixed_amount || ""
        });
        setIsEditing(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;
        setLoading(true);
        try {
            await deleteRecipient(id);
            setRecipients(recipients.filter(r => r.id !== id));
        } catch (error) {
            alert("Failed to delete");
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            if (currentRecipient.id) formData.append("id", currentRecipient.id);
            formData.append("name", currentRecipient.name);
            formData.append("category", currentRecipient.category);
            formData.append("phone", currentRecipient.phone || "");
            if (currentRecipient.default_share) formData.append("default_share", currentRecipient.default_share.toString());
            if (currentRecipient.fixed_amount) formData.append("fixed_amount", currentRecipient.fixed_amount.toString());

            const res = await saveRecipient(formData);
            if (res.success) {
                // To keep it simple, we just reload the page
                window.location.reload();
            }
        } catch (error) {
            alert("Failed to save");
        }
        setLoading(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link href="/silsila" className="btn" style={{ padding: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)' }}>
                        <ArrowLeft size={18} />
                    </Link>
                    <h1>Silsila Recipients</h1>
                </div>
                {!isEditing && (
                    <button onClick={handleCreate} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem' }}>
                        <Plus size={18} /> Add Recipient
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <h2>{currentRecipient.id ? "Edit Recipient" : "New Recipient"}</h2>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                        <div>
                            <label>Name *</label>
                            <input
                                required
                                type="text"
                                className="form-control"
                                value={currentRecipient.name}
                                onChange={e => setCurrentRecipient({ ...currentRecipient, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label>Category *</label>
                            <select
                                required
                                className="form-control"
                                value={currentRecipient.category}
                                onChange={e => setCurrentRecipient({ ...currentRecipient, category: e.target.value })}
                            >
                                <option value="Masjid">Masjid</option>
                                <option value="Orphans">Orphans</option>
                                <option value="Sadqah">Sadqah</option>
                                <option value="Family Support">Family Support</option>
                                <option value="Education">Education</option>
                                <option value="Health">Health</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label>Phone (Optional)</label>
                            <input
                                type="text"
                                className="form-control"
                                value={currentRecipient.phone}
                                onChange={e => setCurrentRecipient({ ...currentRecipient, phone: e.target.value })}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label>Default Share % (Optional)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={currentRecipient.default_share}
                                    onChange={e => setCurrentRecipient({ ...currentRecipient, default_share: e.target.value })}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label>Fixed Amount (Optional)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={currentRecipient.fixed_amount}
                                    onChange={e => setCurrentRecipient({ ...currentRecipient, fixed_amount: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
                                {loading ? "Saving..." : "Save Recipient"}
                            </button>
                            <button type="button" onClick={() => setIsEditing(false)} className="btn" style={{ flex: 1, border: '1px solid var(--border)' }}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Name</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Category</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Phone</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Default Share</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Fixed Amount</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recipients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No recipients added yet.
                                    </td>
                                </tr>
                            ) : (
                                recipients.map((r: any) => (
                                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{r.name}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ background: 'var(--background)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                                                {r.category}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>{r.phone || "-"}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>{r.default_share ? `${r.default_share}%` : "-"}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>{r.fixed_amount ? `₨ ${r.fixed_amount.toFixed(2)}` : "-"}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button onClick={() => handleEdit(r)} className="btn" style={{ padding: '0.4rem', marginRight: '0.5rem', border: '1px solid var(--border)' }}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(r.id, r.name)} className="btn" style={{ padding: '0.4rem', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
