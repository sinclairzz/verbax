import Link from "next/link";
import { LegalShell, OperatorNotice } from "@/components/legal";
export const metadata = {
  title: "Política de privacidade",
  description:
    "Saiba quais dados trabalhistas e pessoais a VERBA.X coleta, como são protegidos, usados e excluídos.",
};
export default function Page() {
  return (
    <LegalShell title="Política de privacidade">
      <h2>1. Quem trata os dados</h2>
      <OperatorNotice />
      <p>
        Esta política descreve o funcionamento efetivo do MVP. Não vendemos
        dados, não exibimos publicidade comportamental e não usamos suas
        informações para treinar modelos de inteligência artificial.
      </p>
      <h2>2. Quais dados coletamos e para quê</h2>
      <ul>
        <li>
          Conta: nome, e-mail, hash da senha, modo de uso e registro de aceite.
          Usados para autenticação, acesso ao serviço e recuperação da senha.
        </li>
        <li>
          Casos: nome do trabalhador, CPF, cargo, empresa opcional, admissão,
          demissão, salário base, dias trabalhados, anos completos, meses
          proporcionais, saldo de FGTS e valores pagos. Usados para registrar o
          contrato e calcular as cinco verbas.
        </li>
        <li>
          Cálculos: fórmulas, parâmetros, fontes, versão, horário, snapshot das
          entradas e diferenças. Usados para reproduzir a análise e gerar
          relatórios.
        </li>
        <li>
          Pagamentos: plano, preço, status, identificadores do cliente,
          checkout, pagamento, assinatura e reembolso no Stripe. Não armazenamos
          número completo de cartão nem código de segurança.
        </li>
        <li>
          Segurança: sessão, tokens de recuperação em hash, registros de ações e
          identificador de rede pseudonimizado para limitar tentativas. Não
          registramos senhas, CPF ou valores financeiros nos logs da aplicação.
        </li>
        <li>Suporte: mensagem, tipo de solicitação, protocolo e status.</li>
      </ul>
      <p>
        Uploads de documentos, OCR, IA consultiva e análise de jornada ainda não
        estão habilitados. Não coletamos arquivos por esses módulos nesta
        versão.
      </p>
      <h2>3. Bases e finalidades do tratamento</h2>
      <p>
        O tratamento necessário à conta, ao cálculo e à contratação se relaciona
        à execução do serviço solicitado. Registros exigidos por obrigações
        legais e dados necessários ao exercício de direitos podem seguir bases
        específicas da LGPD. As medidas de prevenção de fraude e controle de
        acesso têm finalidade de segurança. A revisão jurídica final das bases e
        dos prazos deve ocorrer antes do lançamento comercial.
      </p>
      <h2>4. Segurança e compartilhamento</h2>
      <p>
        Senhas usam Argon2. Dados pessoais e financeiros são criptografados na
        aplicação antes de serem gravados no PostgreSQL. O CPF é mascarado nas
        telas e nos PDFs. Em produção, conexões usam HTTPS e o banco exige TLS.
        Identificadores e metadados técnicos necessários à consulta permanecem
        indexáveis.
      </p>
      <p>
        O Stripe processa pagamentos e recebe o e-mail e os identificadores
        necessários ao checkout. O serviço de e-mail recebe o endereço para
        recuperação de conta. Provedores de hospedagem e banco serão definidos
        no lançamento e deverão oferecer proteção de armazenamento e backups.
        Eventuais transferências internacionais deverão ser informadas na versão
        de produção desta política.
      </p>
      <h2>5. Cookies e armazenamento no navegador</h2>
      <p>
        Usamos cookies essenciais para manter a sessão e prevenir requisições
        indevidas. A sessão dura até 7 dias, salvo saída ou redefinição de
        senha. A preferência de cookies é guardada localmente. Não há pixels de
        publicidade ou ferramentas de analytics.
      </p>
      <p>
        A simulação sem conta não é salva como caso no banco. Os campos
        numéricos podem ficar temporariamente no armazenamento da aba para
        continuar após o cadastro, por até uma hora para reaproveitamento. Eles
        são removidos ao salvar o caso; fechar a aba encerra esse armazenamento.
        Nome e CPF não são gravados nesse rascunho.
      </p>
      <h2>6. Retenção e exclusão</h2>
      <p>
        Os casos permanecem enquanto a conta existir; acesso a relatórios
        depende do plano. Em Configurações, você pode excluir sua conta e os
        casos da base ativa, confirmando e-mail, senha e ciência da exclusão. A
        operação encerra a assinatura e remove os registros locais de pagamento,
        suporte e autenticação vinculados à conta. O Stripe mantém seus
        registros conforme suas obrigações e política própria.
      </p>
      <p>
        Logs de auditoria retêm identificadores opacos, ação e data, sem nome,
        CPF ou valores, por até 180 dias. O comando de manutenção remove sessões
        expiradas, tokens expirados e logs mais antigos. Backups de produção
        deverão ter retenção máxima configurada de 30 dias e excluir cópias
        vencidas; a eliminação na base ativa não apaga retroativamente cópias de
        backup antes desse ciclo.
      </p>
      <p>
        Antes de excluir a conta, baixe os relatórios necessários e solicite
        eventuais reembolsos pendentes. A simulação pública continua disponível
        sem conta.
      </p>
      <h2>7. Seus direitos</h2>
      <p>
        Você pode solicitar confirmação de tratamento, acesso, correção,
        esclarecimentos, portabilidade quando aplicável e eliminação, observados
        os limites legais. Para correções, registre um pedido ou crie um novo
        caso: a memória de um cálculo já gerado é preservada como registro
        imutável, com nova análise para entradas diferentes.
      </p>
      <p>
        Registre a solicitação em{" "}
        <Link href="/dashboard/configuracoes">Suporte e privacidade</Link>. O
        protocolo confirma seu recebimento. Informações sobre direitos e bases
        legais estão na{" "}
        <a
          href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"
          target="_blank"
          rel="noreferrer"
        >
          Lei Geral de Proteção de Dados
        </a>
        .
      </p>
    </LegalShell>
  );
}
