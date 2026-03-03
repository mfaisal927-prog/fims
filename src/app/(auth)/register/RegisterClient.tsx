"use client";

import { useState } from "react";
import { registerAction, verifyOtpAction } from "@/app/actions/auth";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function RegisterClient() {
    const searchParams = useSearchParams();
    const initialEmail = searchParams.get("email") || "";
    const isVerifying = searchParams.get("verify") === "true";

    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<"REGISTER" | "VERIFY">(isVerifying ? "VERIFY" : "REGISTER");
    const [email, setEmail] = useState(initialEmail);
    const [error, setError] = useState("");

    async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const emailInput = formData.get("email") as string;

        try {
            const res = await registerAction(formData);
            if (res.error) {
                setError(res.error as string);
            } else if (res.success) {
                setEmail(emailInput);
                setStep("VERIFY");
            }
        } catch (err: any) {
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        formData.set("email", email);

        try {
            const res = await verifyOtpAction(formData);
            if (res?.error) {
                setError(res.error as string);
            }
        } catch (err: any) {
            setError(err.message || "Verification failed");
        } finally {
            setLoading(false);
        }
    }

    if (step === "VERIFY") {
        return (
            <div className="card" style={{ width: '400px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Verify Email</h2>
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                    We've sent a 6-digit verification code to <strong>{email}</strong>
                </p>

                {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleVerify}>
                    <div className="form-group">
                        <label>Verification Code</label>
                        <input type="text" name="otp" className="form-control" placeholder="123456" maxLength={6} required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                        {loading ? "Verifying..." : "Verify & Login"}
                    </button>
                </form>
                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
                    <button type="button" onClick={() => setStep("REGISTER")} className="btn btn-secondary">
                        Back to Registration
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="card" style={{ width: '400px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Admin Registration</h2>

            {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

            <form onSubmit={handleRegister}>
                <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" defaultValue={email} className="form-control" placeholder="admin@example.com" required />
                </div>
                <div className="form-group">
                    <label>Password</label>
                    <input type="password" name="password" className="form-control" placeholder="••••••••" required minLength={6} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                    {loading ? "Sending Code..." : "Register"}
                </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
                Already have an account? <Link href="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Login instead</Link>
            </div>
        </div>
    );
}
