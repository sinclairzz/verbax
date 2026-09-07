import Link from "next/link";
import { LegalShell, OperatorNotice } from "@/components/legal";
import { getUser } from "@/lib/server";
import { SupportForm } from "@/components/settings-panel";
export const metadata = {
  title: "Contato e suporte",
  description:
    "Entre em contato com a VERBA.X sobre o produto, pagamentos ou seus dados pessoais.",
};
export default async function Page() {
  const user = await getUser();
  return (
    <LegalShell title="Vamos conversar.">
      <p>
        Para dúvidas sobre o serviço, pagamentos ou privacidade, registre uma
        solicitação. Não envie sua senha, dados de cartão ou documentos por este
        formulário.
      </p>
      <OperatorNotice />
      {user ? (
        <SupportForm />
      ) : (
        <>
          <p>
            Entre na sua conta para enviar uma mensagem com protocolo e
            associá-la ao seu atendimento.
          </p>
          <Link href="/login" className="button primary">
            Entrar para falar com o suporte
          </Link>
        </>
      )}
    </LegalShell>
  );
}
