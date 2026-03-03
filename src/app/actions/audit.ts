import prisma from "@/lib/prisma";

export async function logAction({
    action_type,
    entity_type,
    entity_id,
    month,
    details
}: {
    action_type: string;
    entity_type: string;
    entity_id?: string;
    month?: string;
    details?: Record<string, any>;
}) {
    try {
        await prisma.auditLog.create({
            data: {
                actor: "admin",
                action_type,
                entity_type,
                entity_id,
                month,
                details: details ? JSON.stringify(details) : null
            }
        });
    } catch (error) {
        console.error("Failed to log audit action:", error);
    }
}
