import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import { ensureUserSetup } from "./userSetup";

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
}

/** Usuário logado (JWT validado), ou null. Memoizado por request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const metadata = (claims.user_metadata ?? {}) as { name?: string };
  return { id: claims.sub, email: (claims.email as string | undefined) ?? null, name: metadata.name ?? null };
});

/**
 * Exige login: devolve o usuário (já com conta e categorias prontas) ou
 * redireciona para /login. Use em toda página e server action que lê ou
 * altera dados — é aqui que o isolamento entre usuários é garantido.
 */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await ensureUserSetup(user.id, user.email);
  return user;
});
