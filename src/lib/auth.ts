import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, safeEqual, verifySessionValue } from "@/lib/session";

/**
 * Proxy de autenticação simples (single-user)
 * Aceita o cookie de sessão assinado (criado no login) ou o header
 * `Authorization: Bearer <AUTH_TOKEN>`.
 *
 * Uso no proxy.ts:
 *   export { authMiddleware as proxy } from "@/lib/auth"
 */
export function authMiddleware(request: NextRequest) {
  const token = process.env.AUTH_TOKEN;

  if (!token) {
    // Sem token só libera em desenvolvimento. Em produção, um AUTH_TOKEN
    // esquecido no deploy deixaria o app inteiro público — melhor quebrar.
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.next();
    }
    return new NextResponse("AUTH_TOKEN não configurado no servidor.", { status: 500 });
  }

  // Permitir acesso à página de login e assets estáticos
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/favicon") ||
    request.nextUrl.pathname === "/login"
  ) {
    return NextResponse.next();
  }

  const sessionValue = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionValue && verifySessionValue(sessionValue, token)) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ") && safeEqual(authHeader.slice(7), token)) {
    return NextResponse.next();
  }

  // Redirecionar para login se não autenticado
  return NextResponse.redirect(new URL("/login", request.url));
}
