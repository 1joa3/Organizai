import type { MetadataRoute } from "next";

/**
 * Manifesto do app instalável (PWA): nome, ícones e como abre depois de
 * instalado — em tela cheia, sem a barra do navegador.
 * Servido em /manifest.webmanifest, liberado no proxy para quem não está logado.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OrganizAI — Finanças Pessoais",
    short_name: "OrganizAI",
    description: "Controle financeiro de alta performance",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#030303",
    theme_color: "#030303",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
