"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
    const email = formData.get("email");
    const password = formData.get("password");

    if (email === "admin@example.com" && password === "admin") {
        const cookieStore = await cookies();
        cookieStore.set("auth_token", "admin_logged_in", { httpOnly: true });
        redirect("/");
    } else {
        redirect("/login?error=invalid_credentials");
    }
}

export async function logoutAction() {
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");
    redirect("/login");
}
