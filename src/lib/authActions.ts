"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "./supabase/server";

export interface AuthState {
  error?: string;
  message?: string;
  /** O que foi digitado, para preencher de volta: o React limpa o formulário depois da action */
  fields?: { name?: string; email?: string };
}

function typed(formData: FormData) {
  const get = (k: string) => (typeof formData.get(k) === "string" ? (formData.get(k) as string) : undefined);
  return { name: get("name"), email: get("email") };
}

const email = z.string({ error: "Informe o e-mail" }).trim().toLowerCase().email("E-mail inválido");
const password = z.string({ error: "Informe a senha" }).min(8, "A senha precisa ter pelo menos 8 caracteres").max(72, "Senha longa demais");

/** Traduz os erros do Supabase Auth para mensagens em português. */
function authErrorMessage(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "invalid_credentials":
      return "E-mail ou senha incorretos.";
    case "email_not_confirmed":
      return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
    case "user_already_exists":
    case "email_exists":
      return "Já existe uma conta com este e-mail.";
    case "weak_password":
      return "Senha fraca: use letras, números e pelo menos 8 caracteres.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Muitas tentativas. Espere alguns minutos e tente de novo.";
    case "same_password":
      return "A nova senha precisa ser diferente da atual.";
    default:
      console.error("Supabase Auth error:", error);
      return "Não foi possível concluir agora. Tente de novo em instantes.";
  }
}

/** Endereço do site, para os links dos e-mails de confirmação e de recuperação. */
async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/** Só aceita caminhos internos em `next` (evita redirecionar para outro site). */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.object({ email, password: z.string().min(1, "Informe a senha") }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: typed(formData) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authErrorMessage(error), fields: typed(formData) };

  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({ name: z.string().trim().min(1, "Informe seu nome").max(80), email, password })
    .safeParse({ name: formData.get("name"), email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: typed(formData) };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/`,
    },
  });
  if (error) return { error: authErrorMessage(error), fields: typed(formData) };

  // Com confirmação de e-mail ligada (padrão do Supabase) ainda não há sessão
  if (!data.session) {
    return { message: `Enviamos um link de confirmação para ${parsed.data.email}. Abra o e-mail para ativar sua conta.` };
  }
  redirect("/");
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: typed(formData) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/nova-senha`,
  });
  if (error && error.code?.startsWith("over_")) return { error: authErrorMessage(error) };

  // Mesma resposta exista ou não a conta, para não revelar quais e-mails estão cadastrados
  return { message: `Se existir uma conta para ${parsed.data}, enviamos um link para criar uma nova senha.` };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((d) => d.password === d.confirm, "As senhas não conferem")
    .safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: authErrorMessage(error) };

  redirect("/");
}

export async function updateProfile(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.string().trim().min(1, "Informe seu nome").max(80, "Nome longo demais").safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ data: { name: parsed.data } });
  if (error) return { error: authErrorMessage(error) };
  // O nome vem do token: renova a sessão para o menu mostrar o nome novo já
  await supabase.auth.refreshSession();

  revalidatePath("/", "layout");
  return { message: "Nome atualizado." };
}

/** Troca de senha de dentro do app (usuário já logado). */
export async function changePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((d) => d.password === d.confirm, "As senhas não conferem")
    .safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: authErrorMessage(error) };
  return { message: "Senha alterada." };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
