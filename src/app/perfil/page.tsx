import { getUserProfile, requireUser } from "@/lib/dal";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await requireUser();
  const profile = await getUserProfile(user);

  return (
    <ProfileClient
      name={profile.name ?? ""}
      email={user.email ?? ""}
      avatarUrl={profile.avatarUrl}
      createdAt={profile.createdAt}
    />
  );
}
