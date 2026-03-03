import { loginAction } from "@/app/actions/auth";

export const metadata = {
    title: "Login | Payroll Manager",
};

export default function LoginPage() {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: '400px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Admin Login</h2>
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
            </div>
        </div>
    );
}
