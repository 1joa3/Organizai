"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionValue,
  safeEqual,
} from "@/lib/session";
import { createRateLimiter } from "@/lib/rateLimit";

// 5 tentativas erradas por IP a cada 15 minutos
const loginLimiter = createRateLimiter(5, 15 * 60 * 1000);

export async function login(formData: FormData) {
  const token = (formData.get("token") as string) ?? "";
  const expected = process.env.AUTH_TOKEN;

  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

  if (loginLimiter.isBlocked(ip)) {
    return { error: "Muitas tentativas. Tente novamente em alguns minutos." };
  }

  if (!expected || !safeEqual(token, expected)) {
    loginLimiter.registerFailure(ip);
    // Atraso fixo em cada erro, para encarecer tentativas em sequência
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { error: "Token inválido" };
  }

  loginLimiter.reset(ip);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionValue(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  redirect("/");
}
