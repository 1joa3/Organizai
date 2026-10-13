"use client";

import { useActionState } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { FormMessage } from "@/components/auth/AuthCard";
import { changePassword, signOut, updateProfile, type AuthState } from "@/lib/authActions";

interface ProfileClientProps {
  name: string;
  email: string;
  createdAt: string | null;
}

function initials(name: string, email: string) {
  const parts = (name.trim() || email).split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (name.trim() && parts[1] ? parts[1][0] : "")).toUpperCase();
}

const cardMotion = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
});

export default function ProfileClient({ name, email, createdAt }: ProfileClientProps) {
  const [profileState, profileAction, savingProfile] = useActionState<AuthState, FormData>(updateProfile, {});
  const [passwordState, passwordAction, savingPassword] = useActionState<AuthState, FormData>(changePassword, {});

  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  return (
    <div className="space-y-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-4xl text-fg tracking-tight">Meu perfil</h1>
        <p className="text-sm text-text-dim mt-1">Seus dados de acesso ao OrganizAI</p>
      </motion.div>

      {/* Identidade */}
      <motion.div {...cardMotion(0.05)} className="glass-card p-6 flex items-center gap-5">
        <div className="shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-blue/30 to-emerald/30 border border-fg/10 flex items-center justify-center">
          <span className="font-mono-value text-xl text-fg">{initials(name, email)}</span>
        </div>
        <div className="min-w-0">
          <p className="font-display text-xl text-fg truncate">{name || "Sem nome"}</p>
          <p className="text-sm text-text-dim truncate">{email}</p>
          {memberSince && <p className="text-xs text-text-muted mt-1">Membro desde {memberSince}</p>}
        </div>
      </motion.div>

      {/* Nome */}
      <motion.form {...cardMotion(0.1)} action={profileAction} className="glass-card p-6 space-y-4">
        <h2 className="font-display text-lg text-fg">Dados pessoais</h2>
        <FormMessage error={profileState.error} message={profileState.message} />
        <Input name="name" label="Nome" defaultValue={name} autoComplete="name" required maxLength={80} />
        <Input
          label="E-mail"
          value={email}
          readOnly
          disabled
          hint="O e-mail é o seu login e não pode ser alterado por aqui."
        />
        <div className="flex justify-end">
          <Button type="submit" loading={savingProfile}>
            Salvar nome
          </Button>
        </div>
      </motion.form>

      {/* Senha */}
      <motion.form {...cardMotion(0.15)} action={passwordAction} className="glass-card p-6 space-y-4">
        <h2 className="font-display text-lg text-fg">Trocar senha</h2>
        <FormMessage error={passwordState.error} message={passwordState.message} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="password" type="password" label="Nova senha" autoComplete="new-password" minLength={8} required hint="Pelo menos 8 caracteres" />
          <Input name="confirm" type="password" label="Confirme a senha" autoComplete="new-password" minLength={8} required />
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="glass" loading={savingPassword}>
            Trocar senha
          </Button>
        </div>
      </motion.form>

      {/* Sair */}
      <motion.div {...cardMotion(0.2)} className="glass-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg text-fg">Sair da conta</h2>
          <p className="text-sm text-text-dim mt-1">Encerra a sessão neste dispositivo.</p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="danger">
            Sair
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
