import Logo from "@/components/ui/Logo";
import AuthBackground from "./AuthBackground";
import CardSpotlight from "@/components/ui/CardSpotlight";
import BlurText from "@/components/reactbits/BlurText";

/** Moldura das telas de autenticação: logo, título e o conteúdo. */
export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen flex items-center justify-center bg-bg px-4 py-10">
      <AuthBackground />
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Logo size={48} wordmarkClassName="text-3xl" />
        </div>
        <div className="relative glass-card p-8">
          <CardSpotlight />
          <BlurText
            tag="h1"
            text={title}
            animateBy="letters"
            delay={35}
            distance={10}
            blur={6}
            trigger="load"
            className="font-display text-xl text-fg"
          />
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
