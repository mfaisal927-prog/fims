import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month) {
        return new NextResponse("Month is required", { status: 400 });
    }

    const settings = await prisma.settings.findFirst();
    if (!settings || !settings.silsila_enabled) {
        return new NextResponse("Silsila feature is disabled", { status: 400 });
    }

    // Compute Base Amount using Payroll records
    const records = await prisma.payrollRecord.findMany({
        where: { payrollRun: { month } }
    });

    let baseAmount = 0;
    records.forEach(r => {
        if (settings.silsila_base === "bank_received") {
            baseAmount += r.total_pkr;
        } else {
            // net_balance
            baseAmount += r.remaining_pkr;
        }
    });

    const silsilaPercentage = settings.silsila_percentage;
    const silsilaTotal = (baseAmount * silsilaPercentage) / 100;

    const distributions = await prisma.silsilaDistribution.findMany({
        where: { month },
        include: { recipient: true },
        orderBy: { recipient: { name: 'asc' } }
    });

    const totalDistributed = distributions.reduce((sum, d) => sum + d.amount, 0);
    const remainingBalance = silsilaTotal - totalDistributed;

    // Build CSV
    const rows = [];
    rows.push(["Silsila Monthly Report", month]);
    rows.push([]);
    rows.push(["Silsila Base Rule", settings.silsila_base === "bank_received" ? "Bank Received" : "Net Balance"]);
    rows.push(["Base Amount", baseAmount.toFixed(2)]);
    rows.push(["Allocation Percentage", `${silsilaPercentage}%`]);
    rows.push(["Silsila Total", silsilaTotal.toFixed(2)]);
    rows.push(["Total Distributed", totalDistributed.toFixed(2)]);
    rows.push(["Remaining Balance", remainingBalance.toFixed(2)]);
    rows.push([]);
    rows.push(["Recipient", "Category", "Amount (PKR)", "Paid Status", "Payment Date", "Notes"]);

    for (const d of distributions) {
        rows.push([
            `"${d.recipient.name.replace(/"/g, '""')}"`,
            `"${d.recipient.category.replace(/"/g, '""')}"`,
            d.amount.toFixed(2),
            d.is_paid ? "Paid" : "Unpaid",
            d.payment_date ? d.payment_date.toISOString().split('T')[0] : "",
            `"${d.notes ? d.notes.replace(/"/g, '""') : ""}"`
        ]);
    }

    const csvContent = rows.map(r => r.join(",")).join("\n");

    return new NextResponse(csvContent, {
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="silsila_report_${month}.csv"`
        }
    });
}
