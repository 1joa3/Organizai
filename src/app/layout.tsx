import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import ClientLayout from "@/components/ui/ClientLayout";
import { THEME_COOKIE, parseThemeCookie } from "@/lib/theme";
import { SIDEBAR_COOKIE, parseSidebarCookie } from "@/lib/sidebar";
import { getCurrentUser } from "@/lib/dal";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "OrganizAI — Finanças Pessoais",
  description: "Controle financeiro de alta performance",
  applicationName: "OrganizAI",
  // iPhone: abre em tela cheia quando adicionado à Tela de Início
  appleWebApp: { capable: true, title: "OrganizAI", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  // Cor da barra do sistema, acompanhando o fundo do tema
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#030303" },
    { media: "(prefers-color-scheme: light)", color: "#F4F5F7" },
  ],
  // Ocupa a tela toda no iPhone; a barra inferior já desconta a área do gesto
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Sem escolha salva, o atributo fica de fora e o CSS segue o tema do sistema
  const cookieStore = await cookies();
  const theme = parseThemeCookie(cookieStore.get(THEME_COOKIE)?.value);
  const sidebarExpanded = parseSidebarCookie(cookieStore.get(SIDEBAR_COOKIE)?.value);
  const user = await getCurrentUser();

  return (
    <html
      lang="pt-BR"
      data-theme={theme ?? undefined}
      className={`${inter.variable} ${jetbrainsMono.variable} ${plusJakarta.variable} h-full`}
    >
      <body className="min-h-full bg-bg font-sans antialiased text-text selection:bg-blue selection:text-black">
        <ClientLayout initialSidebarExpanded={sidebarExpanded} user={user && { name: user.name, email: user.email }}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
