"use client";

import { useState } from "react";
import { MessageCircle, Search, AlertCircle, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AlertsClient({ data, run, runs }: { data: any[], run: any, runs: any[] }) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, memberData?: any }>({ isOpen: false });

    // Filter by member name
    const filteredData = data.filter(d => d.member.full_name.toLowerCase().includes(search.toLowerCase()));

    const generateMessage = (memberData: any) => {
        const { member, zeroEarning, lowEarning } = memberData;
        const month = run?.month || "Current Month";

        let msg = `Assalamualaikum ${member.full_name},\n\nThis is your performance update for ${month}.\n\n`;

        if (zeroEarning.length > 0 || lowEarning.length > 0) {
            msg += `The following websites need attention:\n\n`;

            if (zeroEarning.length > 0) {
                msg += `🔴 Zero Earning:\n`;
                zeroEarning.forEach((site: any) => {
                    msg += `- ${site.site} ($0)\n`;
                });
                msg += `\n`;
            }

            if (lowEarning.length > 0) {
                msg += `🟠 Low Earning (<$10):\n`;
                lowEarning.forEach((site: any) => {
                    msg += `- ${site.site} ($${site.usd.toFixed(2)})\n`;
                });
                msg += `\n`;
            }
            msg += `Please review and improve performance.\n\n`;
        }

        if (memberData.remainingPkr > 0) {
            msg += `Note: Your remaining payable amount is ₨ ${memberData.remainingPkr.toLocaleString('en-US', { maximumFractionDigits: 0 })}.\n\n`;
        }

        msg += `Regards,\nPayroll Manager`;
        return msg;
    };

    const handleSendAlert = (memberData: any) => {
        if (!memberData.member.phone_email) {
            alert("Warning: Phone number not available for this member.");
            return;
        }

        // Only allow if finalized, but since we ONLY load finalized runs we're mostly safe.
        // Let's still double check.
        if (run?.status !== 'final') {
            alert("Cannot send alerts for draft payroll runs. Please select a finalized run.");
            return;
        }

        setConfirmModal({ isOpen: true, memberData });
    };

    const confirmSend = () => {
        const { memberData } = confirmModal;
        if (!memberData) return;

        const msg = generateMessage(memberData);
        const encoded = encodeURIComponent(msg);

        // Strip non-numeric from phone
        let phone = memberData.member.phone_email.replace(/[^\d+]/g, '');
        // If local format 03..., convert to 923...
        if (phone.startsWith('03')) phone = '92' + phone.substring(1);

        const url = `https://wa.me/${phone}?text=${encoded}`;
        window.open(url, '_blank');

        setConfirmModal({ isOpen: false });
    };

    const exportAllMessages = () => {
        if (run?.status !== 'final') return alert("Only finalized runs can be exported.");

        let fullText = `SMART ALERTS EXPORT - ${run?.month}\n========================================\n\n`;

        filteredData.forEach(memberData => {
            fullText += `--- Message to: ${memberData.member.full_name} (${memberData.member.phone_email || 'No Phone'}) ---\n`;
            fullText += generateMessage(memberData);
            fullText += `\n\n========================================\n\n`;
        });

        const blob = new Blob([fullText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `WhatsApp_Alerts_${run?.month}.txt`;
        a.click();
    };

    const openAllTabs = () => {
        if (run?.status !== 'final') return alert("Only finalized runs can be alerted.");
        if (!confirm(`Are you sure you want to open ${filteredData.length} WhatsApp tabs? Your browser may block popups.`)) return;

        let index = 0;
        const interval = setInterval(() => {
            if (index >= filteredData.length) {
                clearInterval(interval);
                return;
            }

            const memberData = filteredData[index];
            if (memberData.member.phone_email) {
                const msg = generateMessage(memberData);
                const encoded = encodeURIComponent(msg);
                let phone = memberData.member.phone_email.replace(/[^\d+]/g, '');
                if (phone.startsWith('03')) phone = '92' + phone.substring(1);
                const url = `https://wa.me/${phone}?text=${encoded}`;
                window.open(url, '_blank');
            }
            index++;
        }, 1000); // 1 second delay between tabs
    };

    if (runs.length === 0) {
        return (
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <h1 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <MessageCircle color="#25D366" /> Smart WhatsApp Alerts
                </h1>
                <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No finalized payroll runs found. Finalize a payroll run to send alerts.
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <MessageCircle color="#25D366" size={28} /> Smart WhatsApp Alerts
                    </h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Notify members about $0 to &lt;$10 earning websites.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <select
                        className="form-control"
                        value={run?.id || ""}
                        onChange={e => router.push(`/alerts?runId=${e.target.value}`)}
                        style={{ margin: 0, minWidth: '200px' }}
                    >
                        {runs.map(r => (
                            <option key={r.id} value={r.id}>{r.month} (Finalized)</option>
                        ))}
                    </select>

                    <button onClick={exportAllMessages} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem' }}>
                        <FileText size={16} /> Export .txt Info
                    </button>
                    <button onClick={openAllTabs} className="btn" style={{ display: 'flex', gap: '0.5rem', background: '#25D366', color: 'white', border: 'none' }}>
                        <MessageCircle size={16} /> Send to All
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="input"
                        placeholder="Search specific member..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', paddingLeft: '2.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {filteredData.length === 0 ? (
                    <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <AlertCircle size={48} style={{ opacity: 0.5 }} />
                        <div>No alerts needed for any member for {run?.month}.<br />Great job!</div>
                    </div>
                ) : (
                    filteredData.map(alertData => (
                        <div key={alertData.member.id} className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{alertData.member.full_name}</h3>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{alertData.member.phone_email || 'No Phone'}</div>
                                </div>

                                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                    {alertData.zeroEarning.length > 0 && (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#dc2626', marginBottom: '0.5rem' }}>
                                                🔴 Zero Earnings ({alertData.zeroEarning.length})
                                            </div>
                                            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                {alertData.zeroEarning.slice(0, 3).map((s: any, i: number) => <li key={i}>{s.site} ($0)</li>)}
                                                {alertData.zeroEarning.length > 3 && <li>...and {alertData.zeroEarning.length - 3} more</li>}
                                            </ul>
                                        </div>
                                    )}

                                    {alertData.lowEarning.length > 0 && (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#f59e0b', marginBottom: '0.5rem' }}>
                                                🟠 Low Earnings ({alertData.lowEarning.length})
                                            </div>
                                            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                {alertData.lowEarning.slice(0, 3).map((s: any, i: number) => <li key={i}>{s.site} (${s.usd.toFixed(2)})</li>)}
                                                {alertData.lowEarning.length > 3 && <li>...and {alertData.lowEarning.length - 3} more</li>}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <button
                                    onClick={() => handleSendAlert(alertData)}
                                    className="btn btn-primary"
                                    style={{ display: 'flex', gap: '0.5rem', background: '#25D366', color: 'white', border: 'none', padding: '0.75rem 1rem' }}
                                >
                                    <MessageCircle size={18} /> Send Alert
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {confirmModal.isOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div className="card" style={{ maxWidth: '400px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle color="#25D366" /> Confirm Send
                        </h3>
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                            Are you sure you want to open WhatsApp and send an alert to <b>{confirmModal.memberData?.member.full_name}</b>?
                        </p>
                        <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.8rem', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border)' }}>
                            {confirmModal.memberData ? generateMessage(confirmModal.memberData) : ''}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                            <button onClick={() => setConfirmModal({ isOpen: false })} className="btn" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>Cancel</button>
                            <button onClick={confirmSend} className="btn" style={{ background: '#25D366', color: 'white', border: 'none' }}>Yes, Open WhatsApp</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
