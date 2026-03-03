import { getSettings } from "@/app/actions/settings";
import SettingsClient from "./SettingsClient";

export const metadata = {
    title: "Settings | Payroll Manager",
};

export default async function SettingsPage() {
    const settings = await getSettings();

    return <SettingsClient initialData={settings} />;
}
