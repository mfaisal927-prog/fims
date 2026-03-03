"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";
import { importPayrollData, CsvRow } from "@/app/actions/payroll";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle, UploadCloud } from "lucide-react";
import Link from "next/link";

export default function ImportClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [month, setMonth] = useState(searchParams.get("month") || "");
    const [usdRate, setUsdRate] = useState<number | "">("");
    const [csvFile, setCsvFile] = useState<File | null>(null);

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Specific error UI states
    const [unmatchedList, setUnmatchedList] = useState<string[]>([]);
    const [runExists, setRunExists] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setCsvFile(e.target.files[0]);
        } else {
            setCsvFile(null);
        }
    };

    const processImport = async (replaceExisting = false) => {
        if (!month || !usdRate || !csvFile) {
            setErrorMsg("Please fill in all required fields.");
            return;
        }

        setLoading(true);
        setErrorMsg('');
        setUnmatchedList([]);
        setRunExists(false);

        Papa.parse<CsvRow>(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const rows = results.data;
                    // Clean empty garbage from headers if present
                    const cleanRows = rows.filter(r => r.Site && r.Estimated);

                    if (cleanRows.length === 0) {
                        setErrorMsg("CSV is empty or missing required columns 'Site' and 'Estimated'. Ensure headers match exactly.");
                        setLoading(false);
                        return;
                    }

                    const res = await importPayrollData(
                        month,
                        Number(usdRate),
                        cleanRows as CsvRow[],
                        replaceExisting
                    );

                    if (res.unmatched) {
                        setUnmatchedList(res.unmatchedList || []);
                    } else if (res.error === 'run_exists') {
                        setRunExists(true);
                        setErrorMsg(res.message);
                    } else if (res.error) {
                        setErrorMsg(res.message);
                    } else if (res.success) {
                        router.push(`/payroll/${res.runId}`);
                    }
                } catch (err: any) {
                    setErrorMsg("An error occurred trying to parse or send the data: " + err.message);
                } finally {
                    setLoading(false);
                }
            },
            error: (error) => {
                setErrorMsg("Failed to parse CSV: " + error.message);
                setLoading(false);
            }
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        processImport(false);
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <Link href="/payroll" className="btn" style={{ padding: '0.5rem', background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <ArrowLeft size={18} />
                </Link>
                <h1 style={{ margin: 0 }}>Import Monthly Earnings</h1>
            </div>

            {errorMsg && !unmatchedList.length && !runExists && (
                <div style={{ padding: '1rem', backgroundColor: 'var(--danger)', color: 'white', borderRadius: '0.375rem', marginBottom: '1.5rem' }}>
                    {errorMsg}
                </div>
            )}

            {unmatchedList.length > 0 && (
                <div style={{ padding: '1.5rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ color: 'var(--danger)', display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: 0 }}>
                        <AlertCircle size={20} /> Unmatched Sites Found
                    </h3>
                    <p style={{ color: '#991B1B', margin: '0 0 1rem 0' }}>
                        The following sites from your CSV do not match any active websites in the database.
                        Please navigate to the <b>Members</b> page, assign these sites exactly as shown, and try importing again.
                    </p>
                    <ul style={{ color: '#991B1B', background: 'rgba(255,255,255,0.5)', padding: '1rem 2rem', borderRadius: '0.25rem', fontFamily: 'monospace' }}>
                        {unmatchedList.map(s => <li key={s} style={{ marginBottom: '0.25rem' }}>{s}</li>)}
                    </ul>
                </div>
            )}

            {runExists && (
                <div style={{ padding: '1.5rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ color: '#B45309', display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: 0 }}>
                        <AlertCircle size={20} /> Month Already Exists
                    </h3>
                    <p style={{ color: '#92400E', margin: '0 0 1rem 0' }}>
                        A payroll run for <b>{month}</b> already exists in the system. Continuing will delete the previous data for that month and replace it entirely with this upload.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" onClick={() => processImport(true)} className="btn" style={{ backgroundColor: '#B45309', color: 'white' }}>
                            Replace Existing
                        </button>
                        <button type="button" onClick={() => { setRunExists(false); setErrorMsg(''); }} className="btn" style={{ background: 'white', color: 'initial', border: '1px solid var(--border)' }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                    <label>Payroll Month (YYYY-MM) *</label>
                    <input
                        required
                        type="month"
                        className="form-control"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                    />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                    <label>USD to PKR Exchange Rate *</label>
                    <input
                        required
                        type="number"
                        step="0.01"
                        className="form-control"
                        placeholder="e.g 278.50"
                        value={usdRate}
                        onChange={(e) => setUsdRate(e.target.value ? Number(e.target.value) : "")}
                    />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                    <label>Upload CSV File *</label>
                    <div style={{
                        border: '2px dashed var(--border)',
                        padding: '2rem',
                        textAlign: 'center',
                        borderRadius: '0.5rem',
                        backgroundColor: 'var(--background)'
                    }}>
                        <UploadCloud size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                        <input
                            required
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                            Minimum Required Columns: <b>Site</b>, <b>Estimated</b>
                        </p>
                    </div>
                </div>

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || unmatchedList.length > 0 || runExists}
                    style={{ padding: '0.75rem 2rem', marginTop: '1rem' }}
                >
                    {loading ? 'Processing...' : 'Import & Calculate'}
                </button>
            </form>
        </div>
    );
}
