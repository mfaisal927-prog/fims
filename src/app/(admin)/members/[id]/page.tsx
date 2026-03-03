import { getMember, getMemberPerformance } from "@/app/actions/member";
import MemberForm from "./MemberForm";
import { notFound } from "next/navigation";

export const metadata = {
    title: "Edit Member | Payroll Manager",
};

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const isNew = resolvedParams.id === 'new';
    let initialData = null;
    let performanceData: any[] = [];

    if (!isNew) {
        initialData = await getMember(resolvedParams.id);
        if (!initialData) {
            notFound();
        }
        performanceData = await getMemberPerformance(resolvedParams.id);
    }

    return <MemberForm params={resolvedParams} initialData={initialData} performanceData={performanceData} />;
}
