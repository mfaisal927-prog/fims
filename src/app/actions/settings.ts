"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSettings() {
    let settings = await prisma.settings.findFirst();
    if (!settings) {
        settings = await prisma.settings.create({
            data: { company_name: "My Company" }
        });
    }
    return settings;
}

export async function saveSettings(data: FormData) {
    const company_name = data.get("company_name") as string;
    const company_logo = data.get("company_logo") as string;
    const silsila_enabled = data.get("silsila_enabled") === "true";
    const silsila_base = data.get("silsila_base") as string || "net_balance";
    const silsila_percentage = parseInt(data.get("silsila_percentage") as string) || 33;

    const updateData = {
        company_name,
        company_logo,
        silsila_enabled,
        silsila_base,
        silsila_percentage
    };

    const settings = await prisma.settings.findFirst();
    if (settings) {
        await prisma.settings.update({
            where: { id: settings.id },
            data: updateData
        });
    } else {
        await prisma.settings.create({
            data: updateData
        });
    }

    revalidatePath("/settings");
    revalidatePath("/payroll");
    revalidatePath("/silsila");
    return { success: true };
}
