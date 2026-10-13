import AuthCard from "@/components/auth/AuthCard";
import LoginForm from "./LoginForm";

interface PageProps {
  searchParams: Promise<{ next?: string; erro?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { next, erro } = await searchParams;
  return (
    <AuthCard title="Bem-vindo" subtitle="Entre ou crie sua conta para organizar suas finanças">
      <LoginForm next={next} linkError={erro === "link"} />
    </AuthCard>
  );
}
