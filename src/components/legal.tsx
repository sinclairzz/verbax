import Link from "next/link";
import { Header, Footer } from "./public-shell";
import { ScopeNote } from "./ui";
import { contact } from "@/lib/contact";

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
      O atendimento é conduzido por {contact.founder}, fundador da VERBA.X, pelo
      e-mail <a href={`mailto:${contact.email}`}>{contact.email}</a>. Endereço
      de atendimento: {contact.addressLine}, CEP {contact.postalCode}. A
      identificação empresarial completa será publicada antes da abertura
      comercial. Este ambiente está em desenvolvimento e não está habilitado
      para cobranças reais. Usuários cadastrados podem registrar solicitações em{" "}
      <Link href="/dashboard/configuracoes">
        Configurações → Suporte e privacidade
      </Link>
      .
    </p>
  );
}
