"use client";

import PageTitle from "@/components/ui/PageTitle";
import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { removeAvatar, uploadAvatar } from "@/lib/avatarActions";
import { AVATAR_SIZE } from "@/lib/avatar";
import { squareJpeg } from "@/lib/resizeImage";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { FormMessage } from "@/components/auth/AuthCard";
import { useTheme } from "@/components/ui/ThemeToggle";
import { originFromEvent, transitionTheme, type Theme } from "@/lib/theme";
import { changePassword, signOut, updateProfile, type AuthState } from "@/lib/authActions";

interface ProfileClientProps {
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string | null;
}

/**
 * Foto de perfil com os botões de trocar e remover. A imagem escolhida é
 * recortada em quadrado e reduzida no navegador antes de subir.
 */
function AvatarEditor({
  name,
  email,
  avatarUrl,
  children,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  /** Nome, e-mail etc., ao lado da foto; os botões vêm embaixo deles */
  children: React.ReactNode;
}) {
  const toast = useToast();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  // Prévia na hora, enquanto a foto sobe
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Escolha uma imagem", "JPG, PNG ou WebP.");
      return;
    }
    setBusy("upload");
    try {
      const blob = await squareJpeg(file, AVATAR_SIZE);
      const local = URL.createObjectURL(blob);
      setPreview(local);
      const formData = new FormData();
      formData.set("avatar", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      const result = await uploadAvatar(formData);
      if (result.error) {
        toast.error("Não foi possível trocar a foto", result.error);
        setPreview(null);
      } else {
        toast.success("Foto atualizada");
        router.refresh();
      }
    } catch (e) {
      toast.error("Não foi possível usar essa imagem", e instanceof Error ? e.message : undefined);
      setPreview(null);
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setBusy("remove");
    const result = await removeAvatar();
    setBusy(null);
    if (result.error) {
      toast.error("Não foi possível remover a foto", result.error);
      return;
    }
    setPreview(null);
    toast.success("Foto removida");
    router.refresh();
  }

  const shown = preview ?? avatarUrl;

  return (
    <div className="flex items-center gap-5 min-w-0 flex-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy !== null}
        aria-label={shown ? "Trocar foto de perfil" : "Adicionar foto de perfil"}
        className="group relative rounded-full cursor-pointer disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
      >
        <Avatar name={name} email={email} url={shown} size={72} />
        {/* Câmera por cima ao passar o mouse; girando enquanto envia */}
        <span
          className={`absolute inset-0 rounded-full flex items-center justify-center bg-black/45 text-white transition-opacity ${
            busy ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
          }`}
          aria-hidden
        >
          {busy ? (
            <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.3" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        {children}
        <div className="mt-2.5 flex items-center gap-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy !== null}
            className="text-sm font-medium text-blue hover:underline underline-offset-4 cursor-pointer disabled:opacity-50"
          >
            {busy === "upload" ? "Enviando…" : shown ? "Alterar foto" : "Adicionar foto"}
          </button>
          {shown && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy !== null}
              className="text-sm text-text-muted hover:text-coral cursor-pointer disabled:opacity-50"
            >
              {busy === "remove" ? "Removendo…" : "Remover"}
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

const cardMotion = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
});

export default function ProfileClient({ name, email, avatarUrl, createdAt }: ProfileClientProps) {
  const [profileState, profileAction, savingProfile] = useActionState<AuthState, FormData>(updateProfile, {});
  const [passwordState, passwordAction, savingPassword] = useActionState<AuthState, FormData>(changePassword, {});

  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  return (
    <div className="space-y-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <PageTitle text="Meu perfil" />
        <p className="text-sm text-text-dim mt-1">Seus dados de acesso ao OrganizAI</p>
      </motion.div>

      {/* Identidade, com a foto de perfil */}
      <motion.div {...cardMotion(0.05)} className="glass-card p-6 flex flex-wrap items-center gap-5">
        <AvatarEditor name={name} email={email} avatarUrl={avatarUrl}>
          <p className="font-display text-xl text-fg truncate">{name || "Sem nome"}</p>
          <p className="text-sm text-text-dim truncate">{email}</p>
          {memberSince && <p className="text-xs text-text-muted mt-1">Membro desde {memberSince}</p>}
        </AvatarEditor>
      </motion.div>

      {/* Aparência (no celular, o único lugar para trocar o tema) */}
      <motion.div {...cardMotion(0.08)} className="glass-card p-6 space-y-4">
        <h2 className="font-display text-lg text-fg">Aparência</h2>
        <AppearancePicker />
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

function AppearancePicker() {
  const [theme] = useTheme();
  const options: { value: Theme; label: string }[] = [
    { value: "dark", label: "Escuro" },
    { value: "light", label: "Claro" },
  ];
  return (
    <div role="radiogroup" aria-label="Tema" className="flex gap-2 p-1 bg-fg/5 rounded-lg border border-fg/10">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          onClick={(e) => transitionTheme(o.value, originFromEvent(e))}
          className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all cursor-pointer border ${
            theme === o.value ? "bg-blue/10 text-blue border-blue/30" : "text-text-dim hover:text-fg border-transparent"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
