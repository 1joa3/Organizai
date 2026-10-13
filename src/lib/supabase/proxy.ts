import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";

/**
 * Renova a sessão do Supabase (tokens expiram) e devolve o id do usuário
 * logado, se houver. Os cookies renovados vão tanto no request (para a
 * página que vai renderizar agora) quanto na resposta (para o navegador).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseConfig();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // getClaims valida o JWT (não só lê o cookie) e dispara a renovação se preciso
  const { data } = await supabase.auth.getClaims();
  return { response, userId: data?.claims?.sub ?? null };
}
