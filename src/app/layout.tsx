import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import ClientLayout from "@/components/ui/ClientLayout";
import { THEME_COOKIE, parseThemeCookie } from "@/lib/theme";
import { SIDEBAR_COOKIE, parseSidebarCookie } from "@/lib/sidebar";

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
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Sem escolha salva, o atributo fica de fora e o CSS segue o tema do sistema
  const cookieStore = await cookies();
  const theme = parseThemeCookie(cookieStore.get(THEME_COOKIE)?.value);
  const sidebarExpanded = parseSidebarCookie(cookieStore.get(SIDEBAR_COOKIE)?.value);

  return (
    <html
      lang="pt-BR"
      data-theme={theme ?? undefined}
      className={`${inter.variable} ${jetbrainsMono.variable} ${plusJakarta.variable} h-full`}
    >
      <body className="min-h-full bg-bg font-sans antialiased text-text selection:bg-blue selection:text-black">
        <ClientLayout initialSidebarExpanded={sidebarExpanded}>{children}</ClientLayout>
      </body>
    </html>
  );
}
