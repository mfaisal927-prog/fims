import { getPayrollRuns } from "@/app/actions/payroll";
import AlertsClient from "./AlertsClient";
import { getAlertsData } from "@/app/actions/alerts";

export const metadata = {
    title: "Smart Alerts | Payroll Manager",
};

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ runId?: string }> }) {
    const sp = await searchParams;
    const runId = sp?.runId;

    const data = await getAlertsData(runId);

    // Only finalized runs for WhatsApp alerts
    const allRuns = await getPayrollRuns();
    const finalizedRuns = allRuns.filter(r => r.status === 'final');

    return <AlertsClient data={data.alerts} run={data.run} runs={finalizedRuns} />;
}
