import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy de autenticação simples (single-user)
 * Compara o header Authorization com o AUTH_TOKEN do .env
 *
 * Uso no proxy.ts:
 *   export { authMiddleware as proxy } from "@/lib/auth"
 */
export function authMiddleware(request: NextRequest) {
  const token = process.env.AUTH_TOKEN;

  // Se não há token configurado, permite acesso (dev mode)
  if (!token) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  const providedToken = authHeader?.replace("Bearer ", "");

  // Permitir acesso à página de login e assets estáticos
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/favicon") ||
    request.nextUrl.pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // Verificar cookie de sessão
  const sessionToken = request.cookies.get("session-token")?.value;

  if (sessionToken === token || providedToken === token) {
    return NextResponse.next();
  }

  // Redirecionar para login se não autenticado
  return NextResponse.redirect(new URL("/login", request.url));
}
