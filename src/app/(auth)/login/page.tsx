import { loginAction } from "@/app/actions/auth";
import Link from "next/link";

export const metadata = {
    title: "Login | Payroll Manager",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const { error } = await searchParams;

    return (
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: '400px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Admin Login</h2>

                {error === 'invalid_credentials' && (
                    <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>
                        Invalid email or password.
                    </div>
                )}
                {error === 'missing_fields' && (
                    <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>
                        Please provide both email and password.
                    </div>
                )}

                <form action={loginAction}>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" name="email" className="form-control" placeholder="admin@example.com" required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" name="password" className="form-control" placeholder="••••••••" required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                        Login
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
                    Don't have an account? <Link href="/register" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Register here</Link>
                </div>
            </div>
        </div>
    );
}
