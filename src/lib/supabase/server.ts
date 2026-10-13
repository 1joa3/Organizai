import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";

/** Cliente Supabase para Server Components, Server Actions e Route Handlers. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseConfig();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components não podem gravar cookies; o proxy já renova a sessão a cada request
        }
      },
    },
  });
}
