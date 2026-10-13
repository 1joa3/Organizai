"use client";

import { useActionState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthCard, { FormMessage } from "@/components/auth/AuthCard";
import { requestPasswordReset, type AuthState } from "@/lib/authActions";

export default function EsqueciSenhaPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, {});

  return (
    <AuthCard title="Esqueci minha senha" subtitle="Enviamos um link para você criar uma senha nova">
      <form action={action} className="space-y-4">
        <FormMessage error={state.error} message={state.message} />
        <Input name="email" type="email" label="E-mail" autoComplete="email" required autoFocus />
        <Button type="submit" className="w-full" loading={pending}>
          Enviar link
        </Button>
        <p className="text-center text-xs">
          <Link href="/login" className="text-blue hover:underline">
            Voltar para o login
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
