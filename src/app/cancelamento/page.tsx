import Link from "next/link";
import { LegalShell } from "@/components/legal";
export const metadata = {
  title: "Cancelamento e reembolso",
  description:
    "Desista da contratação em até 7 dias corridos. Saiba como solicitar reembolso integral e cancelar sua assinatura VERBA.X.",
};
export default function Page() {
  return (
    <LegalShell title="Liberdade para cancelar.">
      <h2>7 dias para decidir, sem precisar justificar.</h2>
      <p>
        Na contratação online, você pode exercer o direito de arrependimento no
        prazo de 7 dias corridos e receber o valor integral. Nesta
        implementação, o prazo começa na confirmação do pagamento da
        contratação. Ele vale para o plano avulso e para a primeira cobrança de
        uma nova assinatura recorrente.
      </p>
      <p>
        Essa política se baseia no{" "}
        <a
          href="https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm"
          target="_blank"
          rel="noreferrer"
        >
          art. 49 do Código de Defesa do Consumidor
        </a>
        . Os detalhes operacionais e jurídicos precisam ser revisados antes da
        publicação comercial.
      </p>
      <h2>Como solicitar seu reembolso</h2>
      <ol>
        <li>Entre na sua conta e abra “Meu plano”.</li>
        <li>Em “Pagamentos e reembolsos”, encontre a contratação.</li>
        <li>
          Dentro do prazo exibido, clique em “Solicitar reembolso integral”. Não
          é necessário informar um motivo.
        </li>
      </ol>
      <p>
        O pedido é registrado antes do contato com o gateway, preservando o
        momento da solicitação em caso de indisponibilidade. O reembolso é
        encaminhado ao mesmo meio de pagamento. A disponibilização do crédito
        segue os prazos do Stripe e do emissor do cartão.
      </p>
      <p>
        O reembolso do recorrente encerra a assinatura e impede novas
        renovações. No avulso, o acesso completo ao caso é revogado após o
        reembolso. O status permanece disponível no painel.
      </p>
      <h2>Cancelar só a renovação</h2>
      <p>
        Você pode cancelar a renovação da assinatura em qualquer momento no
        painel. Não haverá novas cobranças a partir do cancelamento, e o acesso
        permanece até o final do período já pago. Essa ação é diferente de pedir
        reembolso.
      </p>
      <h2>Se houver um problema</h2>
      <p>
        Se o botão estiver indisponível, o gateway falhar ou o pedido exigir
        análise, registre uma solicitação em “Configurações → Suporte e
        privacidade”. Guarde seu protocolo. Em sandbox, pagamentos e reembolsos
        são testes e não movimentam dinheiro real.
      </p>
      <p>
        <Link className="button primary" href="/dashboard/plano">
          Gerenciar plano e reembolso
        </Link>
      </p>
    </LegalShell>
  );
}
