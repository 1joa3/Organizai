/**
 * Foto de perfil: fica no bucket "avatars" do Supabase Storage, numa pasta
 * com o id do usuário e com nome aleatório (o endereço não é adivinhável).
 * O endereço público vai no user_metadata.avatar_url do Supabase Auth.
 */
export const AVATAR_BUCKET = "avatars";
/** Tamanho final (quadrado), em px: a foto é recortada e reduzida no navegador */
export const AVATAR_SIZE = 256;
/** Limite do arquivo enviado (a foto reduzida tem uns 30 KB) */
export const AVATAR_MAX_BYTES = 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Prefixo dos endereços públicos do bucket */
export function avatarPublicPrefix(supabaseUrl: string) {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${AVATAR_BUCKET}/`;
}

/**
 * Só aceita endereços do nosso bucket, na pasta do próprio usuário. O
 * user_metadata pode ser mudado pelo próprio usuário pela API do Supabase;
 * aqui garantimos que a imagem mostrada veio do upload do app.
 */
export function safeAvatarUrl(value: unknown, userId: string, supabaseUrl: string | undefined): string | null {
  if (typeof value !== "string" || !supabaseUrl) return null;
  const prefix = avatarPublicPrefix(supabaseUrl);
  if (!value.startsWith(prefix)) return null;
  const path = value.slice(prefix.length);
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path) && path.startsWith(`${userId}/`) ? value : null;
}

/** Caminho dentro do bucket a partir do endereço público */
export function avatarPathFromUrl(url: string, supabaseUrl: string): string | null {
  const prefix = avatarPublicPrefix(supabaseUrl);
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}
