/**
 * URL e chave pública do projeto Supabase (Project Settings → API).
 * A chave "publishable"/"anon" é pública por definição — o que protege os
 * dados é o filtro por usuário no servidor, não esconder essa chave.
 */
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) no .env / na Vercel."
    );
  }
  return { url, key };
}
