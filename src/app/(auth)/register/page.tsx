import RegisterClient from "./RegisterClient";
import { Suspense } from "react";

export const metadata = {
    title: "Register | Payroll Manager",
};

export default function RegisterPage() {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
            <Suspense fallback={<div>Loading...</div>}>
                <RegisterClient />
            </Suspense>
        </div>
    );
}
