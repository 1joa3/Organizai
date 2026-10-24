import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safeNext";

/**
 * Destino dos links enviados por e-mail (confirmação de cadastro e
 * recuperação de senha). Aceita os dois formatos do Supabase: `?code=`
 * (template padrão, fluxo PKCE) e `?token_hash=&type=` (template customizado).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));

  const supabase = await createSupabaseServerClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { error: new Error("Link sem código") };

  if (error) {
    return NextResponse.redirect(new URL("/login?erro=link", origin));
  }
  return NextResponse.redirect(new URL(next, origin));
}
