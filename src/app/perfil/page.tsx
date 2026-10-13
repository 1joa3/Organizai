import { requireUser } from "@/lib/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await requireUser();
  // Data de cadastro não vem no token: busca o usuário no Supabase Auth
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  return <ProfileClient name={user.name ?? ""} email={user.email ?? ""} createdAt={data.user?.created_at ?? null} />;
}
