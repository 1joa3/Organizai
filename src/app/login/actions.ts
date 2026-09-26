"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const token = formData.get("token") as string;
  const expected = process.env.AUTH_TOKEN;

  if (!expected || token !== expected) {
    return { error: "Token inválido" };
  }

  const cookieStore = await cookies();
  cookieStore.set("session-token", expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  redirect("/");
}
