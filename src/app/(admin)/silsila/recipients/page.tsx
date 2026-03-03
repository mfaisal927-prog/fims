import { getRecipients } from "@/app/actions/silsila";
import RecipientsClient from "./RecipientsClient";

export const metadata = {
    title: "Silsila Recipients | Payroll Manager",
};

export default async function RecipientsPage() {
    const recipients = await getRecipients();

    return <RecipientsClient initialData={recipients} />;
}
