"use client";

import SegmentedTabs from "@/components/ui/SegmentedTabs";
import { useActionState, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { FormMessage } from "@/components/auth/AuthCard";
import { signIn, signUp, type AuthState } from "@/lib/authActions";

type Mode = "signin" | "signup";

export default function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [signInState, signInAction, signingIn] = useActionState<AuthState, FormData>(signIn, {});
  const [signUpState, signUpAction, signingUp] = useActionState<AuthState, FormData>(signUp, {});

  const state = mode === "signin" ? signInState : signUpState;
  const linkErrorMessage =
    linkError && mode === "signin" && !state.error ? "O link expirou ou já foi usado. Entre ou peça um novo." : undefined;

  return (
    <div className="space-y-5">
      <SegmentedTabs
        full
        ariaLabel="Entrar ou criar conta"
        value={mode}
        onChange={setMode}
        tabClassName="text-sm font-medium h-9!"
        options={[
          { value: "signin", label: "Entrar" },
          { value: "signup", label: "Criar conta" },
        ]}
      />

      <FormMessage error={state.error ?? linkErrorMessage} message={state.message} />

      {mode === "signin" ? (
        <form action={signInAction} className="space-y-4">
          <input type="hidden" name="next" value={next ?? "/"} />
          <Input name="email" type="email" label="E-mail" autoComplete="email" required autoFocus defaultValue={signInState.fields?.email} />
          <Input name="password" type="password" label="Senha" autoComplete="current-password" required />
          <div className="flex justify-end -mt-1">
            <Link href="/esqueci-senha" className="text-xs text-blue hover:underline">
              Esqueci minha senha
            </Link>
          </div>
          <Button type="submit" className="w-full" loading={signingIn}>
            Entrar
          </Button>
        </form>
      ) : (
        <form action={signUpAction} className="space-y-4">
          <Input name="name" label="Nome" autoComplete="name" required autoFocus defaultValue={signUpState.fields?.name} />
          <Input name="email" type="email" label="E-mail" autoComplete="email" required defaultValue={signUpState.fields?.email} />
          <Input
            name="password"
            type="password"
            label="Senha"
            autoComplete="new-password"
            minLength={8}
            required
            hint="Pelo menos 8 caracteres"
          />
          <Button type="submit" className="w-full" loading={signingUp}>
            Criar conta
          </Button>
        </form>
      )}
    </div>
  );
}
