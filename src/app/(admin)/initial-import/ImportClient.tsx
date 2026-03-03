"use client";

import { useState } from "react";
import Papa from "papaparse";
import { processInitialImport, InitialDataRow } from "@/app/actions/import";
import { AlertCircle, CheckCircle, UploadCloud } from "lucide-react";

export default function InitialImportClient() {
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [result, setResult] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setCsvFile(e.target.files[0]);
        } else {
            setCsvFile(null);
        }
    };

    const processImport = async () => {
        if (!csvFile) {
            setErrorMsg("Please upload a CSV file.");
            return;
        }

        setLoading(true);
        setErrorMsg('');
        setResult(null);

        Papa.parse<InitialDataRow>(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const rows = results.data;

                    if (rows.length === 0) {
                        setErrorMsg("CSV is empty or could not be parsed.");
                        setLoading(false);
                        return;
                    }

                    const res = await processInitialImport(rows);
                    setResult(res);

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
        processImport();
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '1.5rem' }}>Initial Data Import</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                Upload a CSV containing members and their assigned websites to bulk-populate the system.
                Members with the same name will be merged. Duplicate websites will be skipped to protect existing data.
            </p>

            {errorMsg && (
                <div style={{ padding: '1rem', backgroundColor: 'var(--danger)', color: 'white', borderRadius: '0.375rem', marginBottom: '1.5rem' }}>
                    {errorMsg}
                </div>
            )}

            {result && (
                <div style={{ padding: '1.5rem', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '0.5rem', marginBottom: '2rem' }}>
                    <h3 style={{ color: '#166534', display: 'flex', gap: '0.5rem', alignItems: 'center', margin: '0 0 1rem 0' }}>
                        <CheckCircle size={20} /> Import Summary
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', color: '#15803D' }}>
                        <div><b>Members Created:</b> {result.membersCreated}</div>
                        <div><b>Members Updated:</b> {result.membersUpdated}</div>
                        <div><b>Websites Created:</b> {result.websitesCreated}</div>
                        <div><b>Duplicates Skipped:</b> {result.skippedDuplicates.length}</div>
                    </div>

                    {result.skippedDuplicates.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <h4 style={{ color: '#991B1B', margin: '0 0 0.5rem 0' }}>Skipped Websites (Already exist in database):</h4>
                            <ul style={{ color: '#B91C1C', fontSize: '0.875rem', margin: 0, paddingLeft: '1.5rem' }}>
                                {result.skippedDuplicates.slice(0, 10).map((s: string) => <li key={s}>{s}</li>)}
                                {result.skippedDuplicates.length > 10 && <li>...and {result.skippedDuplicates.length - 10} more</li>}
                            </ul>
                        </div>
                    )}

                    {result.errors.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <h4 style={{ color: '#991B1B', margin: '0 0 0.5rem 0' }}>Row Errors (Ignored):</h4>
                            <ul style={{ color: '#B91C1C', fontSize: '0.875rem', margin: 0, paddingLeft: '1.5rem' }}>
                                {result.errors.slice(0, 10).map((e: any, i: number) => <li key={i}>Row {e.rowIdx}: {e.message}</li>)}
                                {result.errors.length > 10 && <li>...and {result.errors.length - 10} more errors</li>}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                        <div style={{ textAlign: 'left', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            <b>Required CSV Header Columns:</b>
                            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                                <li><code>member_full_name</code> (string)</li>
                                <li><code>website_name</code> (string - e.g example.com)</li>
                                <li><code>website_percentage</code> (number 0-100)</li>
                            </ul>
                            <b>Optional CSV Columns:</b>
                            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                                <li><code>member_phone</code></li>
                                <li><code>member_details</code></li>
                                <li><code>member_status</code> (active/inactive)</li>
                                <li><code>website_status</code> (active/inactive)</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ padding: '0.75rem 2rem', marginTop: '1rem' }}
                >
                    {loading ? 'Processing Import...' : 'Run Import'}
                </button>
            </form>
        </div>
    );
}
