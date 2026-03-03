"use client";

import { useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { saveMember, checkDomainsOwnership } from '@/app/actions/member';
import { Plus, Trash, ArrowLeft, Upload, Info, Download, MessageCircle, Copy as CopyIcon, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Papa from 'papaparse';
import MemberPerformanceGraph from './MemberPerformanceGraph';

function cleanDomain(url: string) {
    let domain = url.trim().toLowerCase();
    domain = domain.replace(/^https?:\/\//, '');
    domain = domain.replace(/^www\./, '');
    domain = domain.replace(/\/.*$/, ''); // remove path
    return domain;
}

type WebSitePayload = {
    id?: string;
    website_name: string;
    percentage_share: number;
    status: string;
    _delete?: boolean; // GUI helper
}

type ImportSummary = {
    totalRows: number;
    matchedExisting: number;
    added: number;
    merged: number;
    skippedNoChange: number;
    skippedDuplicates: number;
    blocked: { domain: string, owner: string }[];
    invalid: number;
    deleted: number;
    deletedDomains: string[];
};

type PendingImportData = {
    csvRowsByDomain: Map<string, WebSitePayload>;
    totalRows: number;
    invalid: number;
    skippedDuplicates: number;
    ownership: Record<string, string>;
};

export default function MemberEditPage({ params, initialData, performanceData }: { params: any, initialData?: any, performanceData?: any[] }) {
    // Using React's native `use()` to safely unwrap route params in later Nextjs versions, 
    // but if params are just plain object in current version it works fine too.
    const routeParams = params;
    const id = routeParams.id;
    const isEdit = id !== 'new';

    const router = useRouter();

    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        full_name: initialData?.full_name || '',
        details: initialData?.details || '',
        phone_email: initialData?.phone_email || '',
        status: initialData?.status || 'active',
    });

    const [websites, setWebsites] = useState<WebSitePayload[]>(
        initialData?.websites ? initialData.websites : []
    );

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
    const [pendingImport, setPendingImport] = useState<PendingImportData | null>(null);
    const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
    const [showExportConfirm, setShowExportConfirm] = useState(false);

    // WhatsApp Confirmation State
    const [waModalOpen, setWaModalOpen] = useState(false);
    const [waMessage, setWaMessage] = useState('');

    const haveWebsitesChanged = () => {
        const init = initialData?.websites || [];
        if (init.length !== websites.length) return true;

        for (let i = 0; i < init.length; i++) {
            if (init[i].website_name !== websites[i].website_name) return true;
            if (init[i].percentage_share !== websites[i].percentage_share) return true;
            if (init[i].status !== websites[i].status) return true;
        }
        return false;
    };

    const downloadCSV = (dataToExport: WebSitePayload[]) => {
        const csv = Papa.unparse(dataToExport.map(w => ({
            'Website Domain': cleanDomain(w.website_name),
            'Share %': w.percentage_share,
            'Status': w.status.charAt(0).toUpperCase() + w.status.slice(1)
        })));

        const memberName = formData.full_name.trim().replace(/\s+/g, '_') || 'New_Member';
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `member_websites_${memberName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportCSV = () => {
        if (haveWebsitesChanged() && initialData?.websites) {
            setShowExportConfirm(true);
        } else {
            downloadCSV(websites);
        }
    };

    const prepareWaMessage = () => {
        if (!initialData?.websites || initialData.websites.length === 0) {
            alert("No websites assigned in the database to send confirmation for.");
            return;
        }

        let msg = `Assalamualaikum ${formData.full_name || 'Member'},\n\n`;
        msg += `According to our records, the following websites are currently assigned to you:\n\n`;

        initialData.websites.forEach((w: any, index: number) => {
            msg += `${index + 1}) ${w.website_name}\n`;
        });

        msg += `\nPlease confirm:\n\n`;
        msg += `1️⃣ Are you currently working on ALL these websites?\n`;
        msg += `2️⃣ Is there any website missing from this list?\n`;
        msg += `3️⃣ Is there any website listed above that you have already returned?\n\n`;
        msg += `Kindly reply with corrections if needed.\n\n`;
        msg += `Regards,\nPayroll Manager`;

        setWaMessage(msg);
        setWaModalOpen(true);
    };

    const sendWaMessage = () => {
        if (!formData.phone_email) {
            alert('Member phone number not available.');
            return;
        }
        let phone = formData.phone_email.replace(/[^\d+]/g, '');
        if (phone.startsWith('03')) phone = '92' + phone.substring(1);

        const encoded = encodeURIComponent(waMessage);
        window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
        setWaModalOpen(false);
    };

    const copyWaMessage = () => {
        navigator.clipboard.writeText(waMessage);
        alert('Message copied to clipboard!');
    };

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setImportSummary(null);
        setErrorMsg('');

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                console.log('Parsed CSV Data:', results.data);

                let totalRows = results.data.length;
                let invalid = 0;
                let skippedDuplicates = 0;

                const csvRowsByDomain = new Map<string, WebSitePayload>();

                results.data.forEach((row: any) => {
                    const rawNameStr = String(row['Website Name'] || row['website_name'] || row['Website'] || row['website'] || row['Domain'] || row['domain'] || row['Website Domain'] || '').trim();
                    const shareStr = String(row['Percentage Share'] || row['percentage_share'] || row['Share'] || row['share'] || row['Share %'] || row['Percentage'] || row['percentage'] || '').trim();
                    const statusStr = String(row['Status'] || row['status'] || '').trim();

                    if (!rawNameStr) {
                        invalid++;
                        return;
                    }

                    const domain = cleanDomain(rawNameStr);
                    if (!domain) {
                        invalid++;
                        return;
                    }

                    const share = parseFloat(shareStr);
                    if (isNaN(share) || share < 0 || share > 100) {
                        invalid++;
                        return;
                    }

                    if (csvRowsByDomain.has(domain)) {
                        skippedDuplicates++;
                    }

                    csvRowsByDomain.set(domain, {
                        website_name: domain,
                        percentage_share: share,
                        status: statusStr.toLowerCase().includes('inact') ? 'inactive' : 'active'
                    });
                });

                if (csvRowsByDomain.size === 0) {
                    setErrorMsg('No valid websites found in CSV. Please ensure headers include "Website Domain", "Share %", and "Status".');
                    setLoading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    return;
                }

                try {
                    const domains = Array.from(csvRowsByDomain.keys());
                    const ownership = await checkDomainsOwnership(domains, isEdit ? id : null);

                    setPendingImport({
                        csvRowsByDomain,
                        totalRows,
                        invalid,
                        skippedDuplicates,
                        ownership
                    });
                } catch (err: any) {
                    setErrorMsg('Failed to verify website ownership: ' + err.message);
                } finally {
                    setLoading(false);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                }
            },
            error: (err) => {
                setErrorMsg('Failed to parse CSV file: ' + err.message);
                setLoading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        });
    };

    const calculatePreview = (mode: 'merge' | 'replace'): ImportSummary | null => {
        if (!pendingImport) return null;
        let added = 0;
        let merged = 0;
        let matchedExisting = 0;
        let skippedNoChange = 0;
        let deleted = 0;
        const deletedDomains: string[] = [];
        const blocked: { domain: string, owner: string }[] = [];

        const existingMap = new Map<string, number>();
        websites.forEach((w, idx) => {
            existingMap.set(cleanDomain(w.website_name), idx);
        });

        for (const [domain, csvRow] of pendingImport.csvRowsByDomain.entries()) {
            if (pendingImport.ownership[domain]) {
                blocked.push({ domain, owner: pendingImport.ownership[domain] });
                continue;
            }

            if (existingMap.has(domain)) {
                matchedExisting++;
                const existing = websites[existingMap.get(domain)!];
                if (existing.percentage_share === csvRow.percentage_share && existing.status === csvRow.status) {
                    skippedNoChange++;
                } else {
                    merged++;
                }
            } else {
                added++;
            }
        }

        if (mode === 'replace') {
            for (const w of websites) {
                const domain = cleanDomain(w.website_name);
                if (!pendingImport.csvRowsByDomain.has(domain)) {
                    deleted++;
                    deletedDomains.push(domain);
                }
            }
        }

        return {
            totalRows: pendingImport.totalRows,
            matchedExisting,
            added,
            merged,
            skippedNoChange,
            skippedDuplicates: pendingImport.skippedDuplicates,
            blocked,
            invalid: pendingImport.invalid,
            deleted,
            deletedDomains
        };
    };

    const preview = pendingImport ? calculatePreview(importMode) : null;

    const applyImport = () => {
        if (!preview || !pendingImport) return;

        setWebsites(prevWebsites => {
            let newWebsites = [...prevWebsites];

            if (importMode === 'replace') {
                newWebsites = newWebsites.filter(w => {
                    const domain = cleanDomain(w.website_name);
                    return pendingImport.csvRowsByDomain.has(domain);
                });
            }

            const existingMap = new Map<string, number>();
            newWebsites.forEach((w, idx) => {
                existingMap.set(cleanDomain(w.website_name), idx);
            });

            for (const [domain, csvRow] of pendingImport.csvRowsByDomain.entries()) {
                if (pendingImport.ownership[domain]) continue; // blocked

                if (existingMap.has(domain)) {
                    const idx = existingMap.get(domain)!;
                    newWebsites[idx] = {
                        ...newWebsites[idx],
                        percentage_share: csvRow.percentage_share,
                        status: csvRow.status
                    };
                } else {
                    newWebsites.push(csvRow);
                }
            }

            return newWebsites;
        });

        setImportSummary(preview);
        setPendingImport(null);
        setImportMode('merge');
    };

    const addWebsite = () => {
        setWebsites([...websites, { website_name: '', percentage_share: 100, status: 'active' }]);
    };

    const updateWebsite = (index: number, field: string, value: any) => {
        const newWebsites = [...websites];
        newWebsites[index] = { ...newWebsites[index], [field]: value };
        setWebsites(newWebsites);
    };

    const removeWebsite = (index: number) => {
        const newWebsites = [...websites];
        newWebsites.splice(index, 1);
        setWebsites(newWebsites);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        const fd = new FormData();
        fd.append('id', id);
        fd.append('full_name', formData.full_name);
        fd.append('details', formData.details);
        fd.append('phone_email', formData.phone_email);
        fd.append('status', formData.status);
        fd.append('websites', JSON.stringify(websites));

        const res = await saveMember(fd);

        if (res?.error) {
            setErrorMsg(res.error);
            setLoading(false);
        } else {
            router.push('/members');
            router.refresh();
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <Link href="/members" className="btn" style={{ padding: '0.5rem', background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <ArrowLeft size={18} />
                </Link>
                <h1 style={{ margin: 0 }}>{isEdit ? 'Edit Member' : 'Add New Member'}</h1>
            </div>

            {errorMsg && (
                <div style={{ padding: '1rem', backgroundColor: 'var(--danger)', color: 'white', borderRadius: '0.375rem', marginBottom: '1.5rem' }}>
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Full Name *</label>
                        <input
                            required
                            type="text"
                            className="form-control"
                            value={formData.full_name}
                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Phone / Email</label>
                        <input
                            type="text"
                            className="form-control"
                            value={formData.phone_email}
                            onChange={e => setFormData({ ...formData, phone_email: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Status</label>
                        <select
                            className="form-control"
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                    <label>Details / Notes</label>
                    <textarea
                        className="form-control"
                        rows={3}
                        value={formData.details}
                        onChange={e => setFormData({ ...formData, details: e.target.value })}
                    />
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                Assigned Websites
                                <span style={{ fontSize: '0.85rem', padding: '0.15rem 0.5rem', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', borderRadius: '1rem', fontWeight: 600 }}>
                                    Total Websites: {websites.length}
                                </span>
                            </h2>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                You can import or export a CSV file with columns: <b>Website Domain, Share %, Status</b>.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="file"
                                accept=".csv"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleImportCSV}
                            />
                            {isEdit && (
                                <button type="button" onClick={prepareWaMessage} disabled={!initialData?.websites?.length} className="btn" style={{ backgroundColor: '#25D366', color: 'white', display: 'flex', gap: '0.5rem', border: 'none', cursor: !initialData?.websites?.length ? 'not-allowed' : 'pointer', opacity: !initialData?.websites?.length ? 0.5 : 1 }}>
                                    <MessageCircle size={16} /> WA Confirm
                                </button>
                            )}
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn" style={{ backgroundColor: 'var(--background)', display: 'flex', gap: '0.5rem', border: '1px solid var(--border)', cursor: 'pointer' }}>
                                <Upload size={16} /> Import
                            </button>
                            <button type="button" onClick={handleExportCSV} disabled={websites.length === 0} className="btn" style={{ backgroundColor: 'var(--background)', display: 'flex', gap: '0.5rem', border: '1px solid var(--border)', cursor: websites.length === 0 ? 'not-allowed' : 'pointer', opacity: websites.length === 0 ? 0.5 : 1 }}>
                                <Download size={16} /> Export
                            </button>
                            <button type="button" onClick={addWebsite} className="btn" style={{ backgroundColor: 'var(--background)', display: 'flex', gap: '0.5rem', border: '1px solid var(--border)' }}>
                                <Plus size={16} /> Add Website
                            </button>
                        </div>
                    </div>

                    {importSummary && (
                        <div style={{ padding: '1rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                                <Info size={16} /> Import Summary
                            </h3>
                            <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem' }}>
                                <li style={{ fontWeight: 600 }}>Total rows in CSV: {importSummary.totalRows}</li>
                                {importSummary.added > 0 && <li style={{ color: '#16a34a', fontWeight: 500 }}>Added {importSummary.added} new websites.</li>}
                                {importSummary.matchedExisting > 0 && <li>Matched {importSummary.matchedExisting} existing websites.</li>}
                                {importSummary.merged > 0 && <li style={{ color: '#2563eb', fontWeight: 500 }}>Merged/Updated {importSummary.merged} websites with new values.</li>}
                                {importSummary.deleted > 0 && <li style={{ color: '#ef4444', fontWeight: 500 }}>Deleted {importSummary.deleted} websites not in CSV.</li>}
                                {importSummary.skippedNoChange > 0 && <li>Skipped {importSummary.skippedNoChange} websites (no changes needed).</li>}
                                {importSummary.skippedDuplicates > 0 && <li style={{ color: '#d97706', fontWeight: 500 }}>Skipped {importSummary.skippedDuplicates} duplicates within the CSV file.</li>}
                                {importSummary.invalid > 0 && <li style={{ color: '#dc2626' }}>Skipped {importSummary.invalid} invalid rows (missing domain or bad percentage).</li>}
                                {importSummary.blocked.length > 0 && (
                                    <li style={{ color: '#dc2626' }}>
                                        Blocked {importSummary.blocked.length} domains already owned by other members:
                                        <ul style={{ marginTop: '0.25rem', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            {importSummary.blocked.map((b, i) => (
                                                <li key={i}>{b.domain} <span style={{ color: 'var(--text-muted)' }}>(owned by {b.owner})</span></li>
                                            ))}
                                        </ul>
                                    </li>
                                )}
                                {importSummary.added === 0 && importSummary.merged === 0 && (
                                    <li style={{ color: 'var(--text-muted)' }}>
                                        {importSummary.skippedNoChange > 0
                                            ? `All ${importSummary.skippedNoChange} websites already exist with identical values.`
                                            : "No changes were made to the form from this CSV."}
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}

                    {websites.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--background)', borderRadius: '0.5rem', color: 'var(--text-muted)' }}>
                            No websites assigned. Click "Add Website" to begin.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {websites.map((website, index) => (
                                <div key={index} style={{ display: 'grid', gridTemplateColumns: 'auto 2fr 1fr 1fr auto', gap: '1rem', alignItems: 'end', background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.9rem', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '1.5rem' }}>
                                        {index + 1}
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '0.75rem' }}>Website Domain (e.g. site.com)</label>
                                        <input
                                            required
                                            type="text"
                                            className="form-control"
                                            placeholder="example.com"
                                            value={website.website_name}
                                            onChange={e => updateWebsite(index, 'website_name', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '0.75rem' }}>Share % (0-100)</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            className="form-control"
                                            value={website.percentage_share}
                                            onChange={e => updateWebsite(index, 'percentage_share', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '0.75rem' }}>Status</label>
                                        <select
                                            className="form-control"
                                            value={website.status}
                                            onChange={e => updateWebsite(index, 'status', e.target.value)}
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() => removeWebsite(index)}
                                        style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', height: '40px' }}
                                    >
                                        <Trash size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.75rem 2rem' }}>
                        {loading ? 'Saving...' : 'Save Member'}
                    </button>
                </div>

            </form>

            {preview && pendingImport && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
                    <div style={{ backgroundColor: 'var(--card)', padding: '2rem', borderRadius: '0.75rem', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
                        <h2 style={{ top: 0, margin: '0 0 1rem 0' }}>Import Mode Confirmation</h2>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.5rem', flex: 1, backgroundColor: importMode === 'merge' ? 'rgba(37, 99, 235, 0.1)' : 'transparent', borderColor: importMode === 'merge' ? '#2563eb' : 'var(--border)', transition: 'all 0.2s' }}>
                                <input type="radio" name="importMode" value="merge" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} style={{ cursor: 'pointer' }} />
                                <div>
                                    <div style={{ fontWeight: 600 }}>Merge (Default)</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Add new and update existing websites. Keep old ones.</div>
                                </div>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.5rem', flex: 1, backgroundColor: importMode === 'replace' ? 'rgba(220, 38, 38, 0.1)' : 'transparent', borderColor: importMode === 'replace' ? '#dc2626' : 'var(--border)', transition: 'all 0.2s' }}>
                                <input type="radio" name="importMode" value="replace" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} style={{ cursor: 'pointer' }} />
                                <div>
                                    <div style={{ fontWeight: 600 }}>Replace</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Only keep websites from CSV. Remove others from form.</div>
                                </div>
                            </label>
                        </div>

                        <div style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Info size={16} /> Preview Summary</h3>
                            <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem' }}>
                                <li><strong>Will Add:</strong> <span style={{ color: preview!.added > 0 ? '#16a34a' : 'inherit' }}>{preview!.added} websites</span></li>
                                <li><strong>Will Update/Merge:</strong> <span style={{ color: preview!.merged > 0 ? '#2563eb' : 'inherit' }}>{preview!.merged} websites</span></li>

                                {importMode === 'replace' && (
                                    <li>
                                        <strong>Will Delete:</strong> <span style={{ color: preview!.deleted > 0 ? '#dc2626' : 'inherit', fontWeight: preview!.deleted > 0 ? 600 : 400 }}>{preview!.deleted} websites</span>
                                        {preview!.deleted > 0 && <span style={{ color: '#dc2626', fontSize: '0.8rem', marginLeft: '0.5rem' }}>({preview!.deletedDomains.slice(0, 3).join(', ')}{preview!.deleted > 3 ? '...' : ''})</span>}
                                    </li>
                                )}

                                {preview!.skippedNoChange > 0 && <li><strong>Will Skip (no change):</strong> <span style={{ color: 'var(--text-muted)' }}>{preview!.skippedNoChange} websites</span></li>}
                                {preview!.blocked.length > 0 && <li style={{ color: '#dc2626' }}><strong>Blocked (owned):</strong> {preview!.blocked.length} websites</li>}
                            </ul>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button type="button" className="btn" onClick={() => { setPendingImport(null); setLoading(false); }} style={{ padding: '0.5rem 1rem', background: 'var(--background)', border: '1px solid var(--border)' }}>Cancel</button>
                            <button type="button" className="btn btn-primary" onClick={applyImport} style={{ padding: '0.5rem 1rem' }}>Apply {importMode === 'replace' ? 'Replace' : 'Merge'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showExportConfirm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
                    <div style={{ backgroundColor: 'var(--card)', padding: '2rem', borderRadius: '0.75rem', maxWidth: '500px', width: '100%', border: '1px solid var(--border)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
                        <h2 style={{ top: 0, margin: '0 0 1rem 0' }}>Unsaved Changes Detected</h2>
                        <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-muted)' }}>
                            You have made changes to the websites that are not yet saved. Which version would you like to export?
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => { downloadCSV(initialData?.websites || []); setShowExportConfirm(false); }}
                                style={{ padding: '1rem', background: 'var(--background)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}
                            >
                                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    Export Saved DB Data
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Export the websites currently saved in the database ({initialData?.websites?.length || 0} websites).</div>
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => { downloadCSV(websites); setShowExportConfirm(false); }}
                                style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}
                            >
                                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                                    Export Current Form
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>Export the current modified list of websites you see on screen ({websites.length} websites).</div>
                            </button>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setShowExportConfirm(false)}
                                style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', alignSelf: 'center', marginTop: '0.5rem' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {waModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
                    <div className="card" style={{ maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle color="#25D366" /> Send Website Confirmation
                        </h3>
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                            Send website confirmation message to <b>{formData.full_name || 'this member'}</b>?
                        </p>

                        {!formData.phone_email && (
                            <div style={{ padding: '0.5rem', background: 'var(--danger)', color: 'white', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                                Warning: Member phone number not available. You can only copy the message.
                            </div>
                        )}

                        <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.875rem', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)' }}>
                            {waMessage}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                            <button type="button" onClick={() => setWaModalOpen(false)} className="btn" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>Cancel</button>
                            <button type="button" onClick={copyWaMessage} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)' }}>
                                <CopyIcon size={16} /> Copy
                            </button>
                            <button type="button" onClick={sendWaMessage} disabled={!formData.phone_email} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#25D366', border: 'none' }}>
                                <MessageCircle size={16} /> Open WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isEdit && performanceData && (
                <MemberPerformanceGraph data={performanceData} />
            )}
        </div>
    );
}
