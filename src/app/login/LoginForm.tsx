"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { login } from "./actions";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        name="token"
        type="password"
        label="Token"
        required
        autoFocus
        error={error ?? undefined}
      />
      <Button type="submit" className="w-full" loading={isPending}>
        Entrar
      </Button>
    </form>
  );
}
