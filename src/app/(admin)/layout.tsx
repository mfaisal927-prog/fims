import Sidebar from "@/components/Sidebar";
import { logoutAction } from "@/app/actions/auth";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="app-container">
            <Sidebar />
            <main className="main-content">
                <header className="topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span>Admin User</span>
                        <form action={logoutAction}>
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                                Logout
                            </button>
                        </form>
                    </div>
                </header>
                <div className="page-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
