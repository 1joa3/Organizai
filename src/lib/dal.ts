import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import { ensureUserSetup } from "./userSetup";
import { safeAvatarUrl } from "./avatar";

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
  /** Foto de perfil (endereço público no Storage), ou null */
  avatarUrl: string | null;
}

/** Usuário logado (JWT validado), ou null. Memoizado por request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const metadata = (claims.user_metadata ?? {}) as { name?: string; avatar_url?: unknown };
  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    name: metadata.name ?? null,
    avatarUrl: safeAvatarUrl(metadata.avatar_url, claims.sub, process.env.NEXT_PUBLIC_SUPABASE_URL),
  };
});

export interface UserProfile {
  name: string | null;
  avatarUrl: string | null;
  /** Data de cadastro (ISO), ou null */
  createdAt: string | null;
}

/**
 * Nome e foto atuais, lidos do Supabase Auth — não do token. O token só é
 * renovado no aparelho onde o perfil mudou; nos outros ele guarda o nome e a
 * foto antigos por até ~1 h. Por isso o que é exibido vem daqui, e o token
 * fica só para saber quem está logado. Memoizado por request.
 */
export const getUserProfile = cache(async (user: CurrentUser): Promise<UserProfile> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  // Se o Auth não responder, mostra o que veio no token em vez de quebrar a página
  if (error || data.user?.id !== user.id) return { name: user.name, avatarUrl: user.avatarUrl, createdAt: null };
  const metadata = (data.user.user_metadata ?? {}) as { name?: string; avatar_url?: unknown };
  return {
    name: metadata.name ?? null,
    avatarUrl: safeAvatarUrl(metadata.avatar_url, user.id, process.env.NEXT_PUBLIC_SUPABASE_URL),
    createdAt: data.user.created_at ?? null,
  };
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
