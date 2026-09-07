import Link from "next/link";
import { LegalShell, OperatorNotice } from "@/components/legal";
export const metadata = {
  title: "Termos de uso",
  description:
    "Escopo da análise VERBA.X, planos, limitações, dados fornecidos e condições de utilização.",
};
export default function Page() {
  return (
    <LegalShell title="Termos de uso">
      <h2>1. O serviço e seu responsável</h2>
      <p>
        A VERBA.X é uma plataforma de auditoria trabalhista que compara dados
        declarados de rescisão com valores apurados por um motor determinístico.
        Esta versão oferece o Modo Trabalhador. O cálculo é executado em código,
        sem modelos de IA decidindo valores monetários.
      </p>
      <OperatorNotice />
      <h2>2. O que está incluído nesta versão</h2>
      <p>
        O cálculo considera demissão sem justa causa com aviso prévio
        indenizado: saldo de salário, aviso proporcional com teto de 90 dias,
        férias proporcionais acrescidas de 1/3, 13º proporcional e multa de 40%
        sobre o FGTS informado. O saldo de FGTS não integra a soma; somente a
        multa.
      </p>
      <p>
        São fórmulas ilustrativas fornecidas para o MVP, com fundamentos
        explicitamente marcados como “a confirmar”. INSS, IRRF, descontos,
        médias, férias vencidas, reflexos, estabilidade, convenções coletivas,
        jornada e adicionais não são calculados. Upload, OCR e IA consultiva
        estão indisponíveis e identificados como “em breve”.
      </p>
      <h2>3. Responsabilidade sobre os dados e os resultados</h2>
      <p>
        Você informa salário base, datas, períodos, dias, FGTS depositado e
        valores pagos. Dados incompletos ou incorretos alteram os resultados.
        Compare o total bruto das mesmas cinco verbas, sem incluir saque do FGTS
        ou outras parcelas. Não atribuímos valor zero a verbas pagas que você
        não detalhou: a divergência por verba fica pendente.
      </p>
      <p>
        “Calculado” indica que uma fórmula foi executada; não significa fato
        confirmado ou garantia jurídica. “Possível diferença”, no FGTS, sinaliza
        que os depósitos não foram auditados. Uma diferença apurada não
        representa dívida reconhecida, decisão judicial ou promessa de
        recuperação de dinheiro.
      </p>
      <h2>4. Conta e acesso</h2>
      <p>
        A simulação básica dispensa conta e cartão. O cadastro exige nome,
        e-mail, senha e aceite expresso destes termos e da política de
        privacidade. Você é responsável por manter sua senha protegida. Cada
        organização tem acesso somente aos próprios casos.
      </p>
      <h2>5. Planos e cobrança</h2>
      <ul>
        <li>
          Grátis: triagem, comparação básica e acesso ao caso salvo mais
          recente, sem memória completa ou PDF.
        </li>
        <li>
          Avulso: R$ 247,90, pagamento único, para um caso selecionado, cálculo
          detalhado e laudo em PDF. Um caso contratado por conta nesta versão.
        </li>
        <li>
          Recorrente: R$ 27,90 por mês no cartão, com cobrança recorrente até
          cancelamento, acesso contínuo, histórico completo, PDFs e canal de
          suporte.
        </li>
      </ul>
      <p>
        Pagamento e acesso são confirmados pelo Stripe. Dados completos de
        cartão ficam no gateway. Em sandbox, não há cobrança financeira real. O
        encerramento da assinatura preserva eventual caso avulso já contratado;
        os demais casos antigos voltam a depender de acesso recorrente ativo.
      </p>
      <h2>6. Cancelamento e reembolso</h2>
      <p>
        Você pode desistir da contratação em até 7 dias corridos e receber
        reembolso integral, sem justificativa. A política cobre o avulso e a
        primeira cobrança do recorrente. A renovação pode ser cancelada no
        painel, mantendo o acesso até o fim do período pago.{" "}
        <Link href="/cancelamento">Leia o procedimento completo.</Link>
      </p>
      <h2>7. Uso adequado e privacidade</h2>
      <p>
        Informe apenas dados próprios ou que você esteja autorizado a usar. Não
        tente acessar contas de terceiros, contornar permissões ou sobrecarregar
        o serviço. Consulte a{" "}
        <Link href="/politica-de-privacidade">Política de Privacidade</Link>{" "}
        para conhecer os dados tratados e as opções de exclusão.
      </p>
      <h2>8. Limites da análise</h2>
      <p>
        O relatório é uma análise baseada nos dados fornecidos e não substitui
        avaliação jurídica quando necessária. A entrada em produção comercial
        depende de identificação do fornecedor e revisão jurídica das regras,
        dos documentos e do fluxo de reembolso.
      </p>
    </LegalShell>
  );
}
