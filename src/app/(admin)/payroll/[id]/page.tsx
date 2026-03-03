import { getPayrollRun } from "@/app/actions/payroll";
import PayrollDetailsClient from "./PayrollDetailsClient";
import { notFound } from "next/navigation";

export const metadata = {
    title: "Payroll Details | Payroll Manager",
};

export default async function PayrollDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const run = await getPayrollRun(resolvedParams.id);

    if (!run) {
        notFound();
    }

    return <PayrollDetailsClient run={run} />;
}
