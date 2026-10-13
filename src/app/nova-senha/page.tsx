"use client";

import { useActionState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthCard, { FormMessage } from "@/components/auth/AuthCard";
import { updatePassword, type AuthState } from "@/lib/authActions";

/** Aberta pelo link de recuperação (que já deixa o usuário logado). */
export default function NovaSenhaPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, {});

  return (
    <AuthCard title="Nova senha" subtitle="Escolha a senha que você vai usar a partir de agora">
      <form action={action} className="space-y-4">
        <FormMessage error={state.error} message={state.message} />
        <Input name="password" type="password" label="Nova senha" autoComplete="new-password" minLength={8} required autoFocus />
        <Input name="confirm" type="password" label="Confirme a senha" autoComplete="new-password" minLength={8} required />
        <Button type="submit" className="w-full" loading={pending}>
          Salvar senha
        </Button>
      </form>
    </AuthCard>
  );
}
