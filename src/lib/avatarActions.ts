"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getUserProfile, requireUser } from "./dal";
import { createSupabaseServerClient } from "./supabase/server";
import { supabaseConfig } from "./supabase/config";
import { AVATAR_BUCKET, AVATAR_MAX_BYTES, AVATAR_TYPES, avatarPathFromUrl } from "./avatar";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Apaga a foto anterior do bucket (sem travar se não der: o arquivo só fica órfão) */
async function removeOld(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, url: string | null) {
  if (!url) return;
  const path = avatarPathFromUrl(url, supabaseConfig().url);
  if (path) await supabase.storage.from(AVATAR_BUCKET).remove([path]);
}

/** Envia a foto de perfil (já recortada e reduzida no navegador) e a salva no perfil. */
export async function uploadAvatar(formData: FormData): Promise<{ error?: string }> {
  const user = await requireUser();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Escolha uma imagem." };
  if (!AVATAR_TYPES.includes(file.type)) return { error: "Use uma imagem JPG, PNG ou WebP." };
  if (file.size > AVATAR_MAX_BYTES) return { error: "A imagem passou de 1 MB." };

  // Foto atual de verdade (o token deste aparelho pode estar desatualizado)
  const { avatarUrl: previous } = await getUserProfile(user);
  const supabase = await createSupabaseServerClient();
  const path = `${user.id}/${randomUUID()}.${EXT[file.type]}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (uploadError) {
    console.error("Avatar upload error:", uploadError);
    return { error: "Não foi possível enviar a foto. Tente de novo em instantes." };
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: data.publicUrl } });
  if (updateError) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    console.error("Avatar metadata error:", updateError);
    return { error: "Não foi possível salvar a foto no perfil." };
  }

  await removeOld(supabase, previous);
  // O token guarda os dados do perfil: renova para a foto nova valer já
  await supabase.auth.refreshSession();
  revalidatePath("/", "layout");
  return {};
}

/** Tira a foto de perfil (volta para as iniciais). */
export async function removeAvatar(): Promise<{ error?: string }> {
  const user = await requireUser();
  const { avatarUrl: previous } = await getUserProfile(user);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ data: { avatar_url: null } });
  if (error) {
    console.error("Avatar remove error:", error);
    return { error: "Não foi possível remover a foto." };
  }
  await removeOld(supabase, previous);
  await supabase.auth.refreshSession();
  revalidatePath("/", "layout");
  return {};
}
