import type { Metadata } from "next";
import "@fontsource/dm-sans/latin-300.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "./globals.css";
import { Cookies } from "@/components/public-shell";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title: {
    default: "VERBA.X — Sua rescisão, às claras",
    template: "%s | VERBA.X",
  },
  description:
    "Confira sua rescisão com um motor de cálculo determinístico. Compare pago e devido, entenda cada verba e acesse sua memória de cálculo.",
  openGraph: {
    title: "VERBA.X — Sua rescisão, às claras",
    description:
      "A IA nunca calcula o seu dinheiro. Cada valor tem uma fórmula, uma regra e uma versão.",
    locale: "pt_BR",
    type: "website",
    images: ["/opengraph-image"],
  },
  robots: { index: process.env.NODE_ENV === "production", follow: true },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>
        {children}
        <Cookies />
      </body>
    </html>
  );
}
