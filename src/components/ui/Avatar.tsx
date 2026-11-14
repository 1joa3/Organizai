"use client";

import { useState } from "react";

interface AvatarProps {
  name: string | null;
  email: string | null;
  url: string | null;
  /** Lado do círculo, em px */
  size: number;
  className?: string;
}

/** Iniciais do nome (ou do e-mail): "João Ferreira" → "JF" */
export function initialsOf(name: string | null, email: string | null) {
  const source = name?.trim() || email || "?";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (name?.trim() && parts[1] ? parts[1][0] : "")).toUpperCase();
}

/**
 * Foto de perfil num círculo; sem foto (ou se a imagem não carregar), as
 * iniciais sobre um fundo azulado.
 */
export default function Avatar({ name, email, url, size, className = "" }: AvatarProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const showPhoto = url && failed !== url;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue/15 text-blue ${className}`}
      style={{ width: size, height: size }}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagem pequena do Storage, já no tamanho certo
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setFailed(url)}
          draggable={false}
        />
      ) : (
        <span className="font-semibold leading-none select-none" style={{ fontSize: Math.max(10, size * 0.36) }}>
          {initialsOf(name, email)}
        </span>
      )}
    </span>
  );
}
