"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { sendOTP } from "@/lib/email";

export async function loginAction(formData: FormData) {
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();

    if (!email || !password) {
        redirect("/login?error=missing_fields");
    }

    const admin = await prisma.admin.findUnique({
        where: { email }
    });

    if (!admin) {
        // Option to default login (fallback) ONLY IF the db is empty:
        const adminCount = await prisma.admin.count();
        if (adminCount === 0 && email === "admin@example.com" && password === "admin") {
            const cookieStore = await cookies();
            cookieStore.set("auth_token", "admin_logged_in", { httpOnly: true });
            redirect("/");
        }
        redirect("/login?error=invalid_credentials");
    }

    if (admin.password !== password) {
        redirect("/login?error=invalid_credentials");
    }

    if (!admin.is_verified) {
        redirect(`/register?email=${encodeURIComponent(email)}&verify=true`);
    }

    const cookieStore = await cookies();
    cookieStore.set("auth_token", admin.id, { httpOnly: true });
    redirect("/");
}

export async function logoutAction() {
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");
    redirect("/login");
}

export async function registerAction(formData: FormData) {
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();

    if (!email || !password) {
        return { error: "Missing fields" };
    }

    // Check if simple pass exists
    let admin = await prisma.admin.findUnique({
        where: { email }
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    if (admin) {
        if (admin.is_verified) {
            return { error: "Admin already exists and is verified." };
        }
        // Update unverified admin
        admin = await prisma.admin.update({
            where: { email },
            data: { password, otp, otp_expiry }
        });
    } else {
        // Create new admin
        admin = await prisma.admin.create({
            data: { email, password, otp, otp_expiry, is_verified: false }
        });
    }

    // Send Email
    const emailResult = await sendOTP(email, otp);
    if (!emailResult.success) {
        console.error("Failed to send OTP:", emailResult.error);
        return { error: "Failed to send verification email. Check SMTP settings." };
    }

    return { success: true, email };
}

export async function verifyOtpAction(formData: FormData) {
    const email = formData.get("email")?.toString();
    const otp = formData.get("otp")?.toString();

    if (!email || !otp) {
        return { error: "Missing fields" };
    }

    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin) {
        return { error: "Admin not found" };
    }

    if (admin.is_verified) {
        return { error: "Admin is already verified" };
    }

    if (admin.otp !== otp || !admin.otp_expiry || new Date() > admin.otp_expiry) {
        return { error: "Invalid or expired verification code" };
    }

    await prisma.admin.update({
        where: { email },
        data: {
            is_verified: true,
            otp: null,
            otp_expiry: null
        }
    });

    // Auto log-in upon successful verification
    const cookieStore = await cookies();
    cookieStore.set("auth_token", admin.id, { httpOnly: true });
    redirect("/");
}
