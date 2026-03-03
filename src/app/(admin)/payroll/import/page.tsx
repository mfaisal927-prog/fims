import { Suspense } from "react";
import ImportClient from "./ImportClient";

export const metadata = {
    title: "Import Payroll | Payroll Manager",
};

export default function ImportPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ImportClient />
        </Suspense>
    );
}
