import Link from "next/link";
import { Header, Footer } from "./public-shell";
import { ScopeNote } from "./ui";

export function LegalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="conteudo" className="legal-content">
        <p className="eyebrow">TRANSPARÊNCIA, POR INTEIRO</p>
        <h1>{title}</h1>
        <p className="muted">
          Versão de 7 de setembro de 2026 · MVP em preparação para lançamento
        </p>
        {children}
        <ScopeNote />
      </main>
      <Footer />
    </>
  );
}
export function OperatorNotice() {
  return (
    <p>
      A identificação empresarial e o canal público do responsável serão
      informados antes da abertura comercial. Este ambiente está em
      desenvolvimento e não está habilitado para cobranças reais. Usuários
      cadastrados podem registrar solicitações em{" "}
      <Link href="/dashboard/configuracoes">
        Configurações → Suporte e privacidade
      </Link>
      .
    </p>
  );
}
