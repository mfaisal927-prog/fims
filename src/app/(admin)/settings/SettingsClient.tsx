"use client";

import { useState } from "react";
import { saveSettings } from "@/app/actions/settings";
import { Save } from "lucide-react";

export default function SettingsClient({ initialData }: { initialData: any }) {
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const [companyName, setCompanyName] = useState(initialData?.company_name || 'My Company');
    const [logoBase64, setLogoBase64] = useState(initialData?.company_logo || '');

    const [silsilaEnabled, setSilsilaEnabled] = useState(initialData?.silsila_enabled || false);
    const [silsilaBase, setSilsilaBase] = useState(initialData?.silsila_base || 'net_balance');
    const [silsilaPercentage, setSilsilaPercentage] = useState(initialData?.silsila_percentage || 33);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setErrorMsg('Logo file is too large (max 2MB)');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoBase64(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setLogoBase64('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMsg('');
        setErrorMsg('');

        try {
            const formData = new FormData();
            formData.append('company_name', companyName);
            formData.append('company_logo', logoBase64);
            formData.append('silsila_enabled', silsilaEnabled.toString());
            formData.append('silsila_base', silsilaBase);
            formData.append('silsila_percentage', silsilaPercentage.toString());

            await saveSettings(formData);
            setSuccessMsg('Settings saved successfully!');
        } catch (err: any) {
            setErrorMsg('Failed to save settings: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '1.5rem' }}>Company Settings</h1>

            {successMsg && (
                <div style={{ padding: '1rem', backgroundColor: 'var(--success)', color: 'white', borderRadius: '0.375rem', marginBottom: '1.5rem' }}>
                    {successMsg}
                </div>
            )}

            {errorMsg && (
                <div style={{ padding: '1rem', backgroundColor: 'var(--danger)', color: 'white', borderRadius: '0.375rem', marginBottom: '1.5rem' }}>
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <div className="form-group" style={{ margin: 0 }}>
                    <label>Company Name *</label>
                    <input
                        required
                        type="text"
                        className="form-control"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                    />
                    <small style={{ color: 'var(--text-muted)' }}>This name will appear on the PDF salary slips.</small>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                    <label>Company Logo (Optional)</label>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                        <div style={{ flex: 1 }}>
                            <input
                                type="file"
                                accept="image/png, image/jpeg"
                                onChange={handleImageUpload}
                                className="form-control"
                            />
                            <small style={{ color: 'var(--text-muted)' }}>Max size 2MB. Appears in upper left of the slip.</small>
                        </div>
                        {logoBase64 && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <img src={logoBase64} alt="Company Logo" style={{ maxWidth: '120px', maxHeight: '120px', objectFit: 'contain', border: '1px solid var(--border)', borderRadius: '0.25rem' }} />
                                <button type="button" onClick={handleRemoveLogo} style={{ fontSize: '0.75rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                    Remove Logo
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <hr style={{ borderColor: 'var(--border)', margin: '1rem 0' }} />
                <h3>Silsila Settings</h3>

                <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={silsilaEnabled}
                            onChange={(e) => setSilsilaEnabled(e.target.checked)}
                            style={{ width: '1.2rem', height: '1.2rem' }}
                        />
                        Enable Silsila Allocation System
                    </label>
                </div>

                {silsilaEnabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '0.5rem' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label>Silsila Base</label>
                            <select
                                className="form-control"
                                value={silsilaBase}
                                onChange={(e) => setSilsilaBase(e.target.value)}
                            >
                                <option value="net_balance">Net Balance (Remaining after payouts)</option>
                                <option value="bank_received">Bank Received (Total amount in PKR)</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                            <label>Silsila Percentage (%)</label>
                            <input
                                type="number"
                                className="form-control"
                                value={silsilaPercentage}
                                onChange={(e) => setSilsilaPercentage(Number(e.target.value))}
                                min="0"
                                max="100"
                            />
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ padding: '0.75rem 2rem', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                    <Save size={18} />
                    {loading ? 'Saving...' : 'Save Settings'}
                </button>
            </form>
        </div>
    );
}
