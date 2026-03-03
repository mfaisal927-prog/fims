import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import JSZip from "jszip";

async function generatePDF(run: any, member: any, records: any[], settings: any) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();

    let y = height - 50;

    // Header 
    if (settings?.company_logo) {
        try {
            const base64Data = settings.company_logo.split(',')[1];
            const imgBuffer = Buffer.from(base64Data, 'base64');
            let image;
            if (settings.company_logo.includes('image/png')) {
                image = await pdfDoc.embedPng(imgBuffer);
            } else {
                image = await pdfDoc.embedJpg(imgBuffer);
            }
            const imgDims = image.scale(0.3);
            page.drawImage(image, {
                x: 50,
                y: y - imgDims.height + 15,
                width: imgDims.width,
                height: imgDims.height,
            });
        } catch (e) {
            console.error("Failed to draw logo", e);
        }
    }

    page.drawText(settings?.company_name || 'Company Name', {
        x: width / 2 - 50,
        y,
        size: 20,
        font: fontBold,
        color: rgb(0, 0, 0),
    });

    y -= 40;
    page.drawText("Salary Slip", { x: 50, y, size: 16, font: fontBold });

    y -= 30;
    page.drawText(`Month: ${run.month}`, { x: 50, y, size: 12, font });
    page.drawText(`Member: ${member.full_name}`, { x: 300, y, size: 12, font: fontBold });

    y -= 40;
    // Table Header
    const headers = ["Site", "USD", "%", "Payable PKR", "Paid PKR", "Remaining"];
    const startX = [50, 200, 280, 330, 420, 500];

    headers.forEach((h, i) => {
        page.drawText(h, { x: startX[i], y, size: 10, font: fontBold });
    });

    y -= 10;
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1 });

    y -= 20;

    let totalUsdShare = 0;
    let totalPayable = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    records.forEach(r => {
        const pkrFormat = (v: number) => `Rs ${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

        page.drawText(r.site.substring(0, 25), { x: startX[0], y, size: 10, font });
        page.drawText('$' + r.usd_amount.toFixed(2), { x: startX[1], y, size: 10, font });
        page.drawText(r.percentage.toString() + '%', { x: startX[2], y, size: 10, font });
        page.drawText(pkrFormat(r.payable_pkr), { x: startX[3], y, size: 10, font });
        page.drawText(pkrFormat(r.paid_pkr), { x: startX[4], y, size: 10, font });
        page.drawText(pkrFormat(r.remaining_pkr), { x: startX[5], y, size: 10, font });

        totalUsdShare += (r.usd_amount * (r.percentage / 100));
        totalPayable += r.payable_pkr;
        totalPaid += r.paid_pkr;
        totalRemaining += r.remaining_pkr;

        y -= 20;
        if (y < 100) {
            // if we need multi-page, ideally we add logic here, but for now assuming low number of sites per member
        }
    });

    y -= 10;
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1 });

    y -= 30;
    page.drawText("Summary Totals", { x: 50, y, size: 14, font: fontBold });

    y -= 20;
    page.drawText(`Total USD Share: $${totalUsdShare.toFixed(2)}`, { x: 50, y, size: 12, font });
    page.drawText(`USD Exchange Rate: Rs ${run.usd_to_pkr_rate}`, { x: 300, y, size: 12, font });

    y -= 20;
    page.drawText(`Total Payable PKR: Rs ${totalPayable.toLocaleString('en-US')}`, { x: 50, y, size: 12, font: fontBold });
    y -= 20;
    page.drawText(`Total Paid PKR: Rs ${totalPaid.toLocaleString('en-US')}`, { x: 50, y, size: 12, font });
    y -= 20;
    page.drawText(`Total Remaining PKR: Rs ${totalRemaining.toLocaleString('en-US')}`, { x: 50, y, size: 12, font: fontBold });

    // Footer
    y = 50;
    page.drawText(`Generated on: ${new Date().toLocaleString()}`, { x: 50, y, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
    page.drawText(`This is a system-generated salary slip.`, { x: 50, y: y - 10, size: 8, font, color: rgb(0.5, 0.5, 0.5) });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ runId: string, memberId: string }> }
) {
    try {
        const resolvedParams = await params;
        const runId = resolvedParams.runId;
        const memberId = resolvedParams.memberId;

        const run = await prisma.payrollRun.findUnique({
            where: { id: runId },
            include: { records: { include: { member: true } } }
        });

        if (!run) return new NextResponse("Run not found", { status: 404 });

        const settings = await prisma.settings.findFirst();

        if (memberId === 'bulk') {
            // Bulk Export via ZIP
            const memGroups = new Map<string, any[]>();
            run.records.forEach(r => {
                if (!memGroups.has(r.member_id)) memGroups.set(r.member_id, []);
                memGroups.get(r.member_id)!.push(r);
            });

            const zip = new JSZip();

            for (const [mId, groupRecords] of Array.from(memGroups.entries())) {
                const mbr = groupRecords[0].member;

                const pdfBytes = await generatePDF(run, mbr, groupRecords, settings);
                zip.file(`SalarySlip_${run.month}_${mbr.full_name.replace(/[^a-z0-9]/gi, '_')}.pdf`, pdfBytes);
            }

            const zipBuffer = await zip.generateAsync({ type: "uint8array" });

            return new NextResponse(zipBuffer as any, {
                headers: {
                    "Content-Type": "application/zip",
                    "Content-Disposition": `attachment; filename=SalarySlips_${run.month}.zip`
                }
            });
        } else {
            // Single Export
            const memberRecords = run.records.filter(r => r.member_id === memberId);
            if (memberRecords.length === 0) {
                return new NextResponse("No records found for this member", { status: 404 });
            }

            const mbr = memberRecords[0].member;
            const pdfBytes = await generatePDF(run, mbr, memberRecords, settings);

            return new NextResponse(pdfBytes as any, {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename=SalarySlip_${run.month}_${mbr.full_name.replace(/[^a-z0-9]/gi, '_')}.pdf`
                }
            });
        }

    } catch (error: any) {
        console.error("PDF generation failed:", error);
        return new NextResponse("Failed to generate PDF: " + error.message, { status: 500 });
    }
}
