import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Rotas acessíveis sem login
const PUBLIC_PATHS = ["/login", "/esqueci-senha"];
const PUBLIC_PREFIXES = ["/auth/"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Checagem otimista no boundary de rede: renova a sessão e manda quem não
 * está logado para /login. A checagem que vale de verdade fica na camada de
 * dados (src/lib/dal.ts), em toda página e server action.
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!userId && !isPublic(pathname)) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (userId && pathname === "/login") {
    // Leva junto os cookies renovados, senão a sessão nova se perde no redirect
    const redirect = NextResponse.redirect(new URL("/", request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
