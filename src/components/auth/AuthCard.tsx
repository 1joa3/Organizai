import Logo from "@/components/ui/Logo";

/** Moldura das telas de autenticação: logo, título e o conteúdo. */
export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Logo size={48} wordmarkClassName="text-3xl" />
        </div>
        <div className="glass-card p-8">
          <h1 className="font-display text-xl text-fg">{title}</h1>
          {subtitle && <p className="text-sm text-text-dim mt-1">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (error) {
    return (
      <p role="alert" className="text-sm text-coral bg-coral/10 border border-coral/20 rounded-lg px-3 py-2">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="text-sm text-emerald bg-emerald/10 border border-emerald/20 rounded-lg px-3 py-2">
        {message}
      </p>
    );
  }
  return null;
}
