import LoginForm from "./LoginForm";
import Logo from "@/components/ui/Logo";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm glass-card p-8">
        <h1 className="mb-2">
          <Logo size={52} wordmarkClassName="text-3xl" />
        </h1>
        <p className="text-sm text-text-dim mb-6">Entre com seu token de acesso</p>
        <LoginForm />
      </div>
    </div>
  );
}
