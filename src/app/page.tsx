import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Fingerprint,
  FileText,
  ScanLine,
  Calculator,
  GitCompareArrows,
  Check,
  Plus,
  LockKeyhole,
  BrainCircuit,
  ListChecks,
} from "lucide-react";
import { Header, Footer } from "@/components/public-shell";
import { ProductPreview } from "@/components/product-preview";
import { Plans } from "@/components/plans";
import { LandingMotion } from "@/components/landing-motion";

const steps = [
  {
    icon: ScanLine,
    title: "Conte sua história.",
    text: "Responda perguntas simples sobre seu contrato e os valores recebidos.",
  },
  {
    icon: Calculator,
    title: "Confira cada cálculo.",
    text: "O motor aplica as regras e registra fórmulas, parâmetros e fundamentos.",
  },
  {
    icon: GitCompareArrows,
    title: "Enxergue a diferença.",
    text: "Compare o que foi pago com o que as regras de cálculo apuraram.",
  },
  {
    icon: FileText,
    title: "Leve tudo com você.",
    text: "Nos planos pagos, baixe o relatório em PDF com a memória completa.",
  },
];
const questions = [
  [
    "Isso substitui um advogado?",
    "Não. A VERBA.X oferece uma análise baseada nos dados fornecidos. Ela não substitui avaliação jurídica quando necessária. As regras desta primeira versão são ilustrativas e seus fundamentos estão a confirmar.",
  ],
  [
    "A inteligência artificial calcula os valores?",
    "Nunca. Todos os valores monetários são calculados por um motor determinístico em código. A camada de IA especializada foi planejada para organizar documentos e explicar contexto; ela está em breve nesta versão.",
  ],
  [
    "Preciso pagar ou criar conta para simular?",
    "Não. A simulação básica é gratuita e pode ser feita sem conta e sem cartão. Para salvar um caso, crie sua conta. A memória detalhada e o PDF são liberados nos planos pagos.",
  ],
  [
    "Quais rescisões posso conferir agora?",
    "Esta versão cobre demissão sem justa causa com aviso prévio indenizado, usando cinco fórmulas básicas. INSS, IRRF, férias vencidas, convenções coletivas, horas extras e outros adicionais ainda não entram no cálculo. Compare valores brutos das mesmas verbas.",
  ],
  [
    "Como funciona o plano de R$ 27,90?",
    "É uma assinatura mensal de R$ 27,90 no cartão de crédito, com cobrança recorrente até cancelamento. Você pode cancelar a renovação no painel. Na primeira contratação, pode desistir em até 7 dias corridos e solicitar reembolso integral.",
  ],
  [
    "Como meus dados são protegidos?",
    "Senhas são armazenadas com hash Argon2. Dados pessoais e financeiros ficam criptografados no banco. O CPF aparece mascarado, e cada organização acessa somente seus próprios casos. Não usamos dados para treinar IA.",
  ],
];

export default function Home() {
  return (
    <LandingMotion>
      <Header />
      <main id="conteudo">
        <section className="hero container">
          <div className="landing-glow" aria-hidden="true" />
          <div className="hero-copy">
            <span className="hero-kicker">
              <span className="status-light" /> AUDITORIA TRABALHISTA, ÀS CLARAS
            </span>
            <h1>
              <span className="hero-title-line">Como saber se</span>{" "}
              <br />
              <span className="hero-title-line">sua rescisão foi</span>
              <br />
              <em className="hero-title-line">paga certo?</em>
            </h1>
            <p className="hero-description">
              Seu trabalho tem valor. Entenda cada verba, confira o que recebeu
              e tenha clareza para dar o próximo passo.
            </p>
            <p className="hero-method">
              Motor determinístico + arquitetura para IA especializada.
              <br />
              <strong>A IA nunca calcula o seu dinheiro.</strong>
            </p>
            <div className="hero-cta">
              <Link href="/simular" className="button primary large">
                Simular gratuitamente <ArrowUpRight size={20} />
              </Link>
              <a href="#como-funciona" className="text-link">
                Entenda como funciona <ArrowRight size={16} />
              </a>
            </div>
            <p className="hero-assurance">
              <Check size={14} /> Sem cadastro para simular <span>·</span> Sem
              cartão de crédito
            </p>
          </div>
          <div className="hero-visual"><ProductPreview /></div>
        </section>
        <div className="trust-strip container">
          <span>
            <ShieldCheck size={19} /> Cálculo determinístico
          </span>
          <span>
            <ListChecks size={19} /> Memória auditável
          </span>
          <span>
            <Fingerprint size={19} /> Privacidade por princípio
          </span>
          <span>
            <FileText size={19} /> Cada regra, uma versão
          </span>
        </div>
        <section id="como-funciona" className="container section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DA DÚVIDA À CLAREZA</p>
              <h2>
                Você informa.
                <br />A VERBA.X mostra o caminho.
              </h2>
            </div>
            <p>
              Sem precisar entender o juridiquês.
              <br />
              Uma pergunta de cada vez.
            </p>
          </div>
          <div className="steps-rail" aria-hidden="true"><span /></div>
          <div className="steps-grid">
            {steps.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className="step-card">
                <div className="step-top">
                  <Icon size={25} strokeWidth={1.4} />
                  <span>0{index + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="confianca" className="container section">
          <div className="trust-panel">
            <div className="trust-intro">
              <span className="eyebrow">
                CONFIANÇA NÃO É UMA PROMESSA. É UM MÉTODO.
              </span>
              <h2>
                Inteligência para organizar.
                <br />
                <span className="gold">Código para calcular.</span>
              </h2>
              <p>
                Quando o assunto é o seu dinheiro, cada número precisa ser
                explicado. Por isso, separamos o que você informa, o que o motor
                calcula e o que exige interpretação.
              </p>
              <div className="trust-lock">
                <LockKeyhole size={18} /> Seu valor nunca é uma resposta gerada
                por IA.
              </div>
            </div>
            <div className="method-stack">
              <article>
                <span className="method-number">01</span>
                <div>
                  <h3>
                    Fato <span>O ponto de partida</span>
                  </h3>
                  <p>
                    Datas, salário e valores que você informa. A origem de cada
                    dado fica registrada.
                  </p>
                </div>
              </article>
              <article>
                <span className="method-number">02</span>
                <div>
                  <h3>
                    Cálculo <span>Regras, não palpites</span>
                  </h3>
                  <p>
                    Fórmulas determinísticas, parâmetros e versões. Você pode
                    conferir como cada resultado foi obtido.
                  </p>
                </div>
              </article>
              <article>
                <span className="method-number">03</span>
                <div>
                  <h3>
                    Interpretação{" "}
                    <span className="soon-label">IA · Em breve</span>
                  </h3>
                  <p>
                    A IA ajudará a organizar documentos e contexto. A avaliação
                    jurídica permanece essencial quando necessária.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>
        <section className="container section product-section">
          <div className="reference-image">
            <Image
              src="/reference/verba-x.jpeg"
              alt="Referência visual fornecida para a VERBA.X, com painel escuro, comparador e gráfico de distribuição. Valores ilustrativos."
              width={1254}
              height={1254}
            />
            <div className="reference-caption">
              Referência visual do produto · valores ilustrativos da imagem
            </div>
          </div>
          <div className="product-copy">
            <p className="eyebrow">TUDO NO SEU DEVIDO LUGAR</p>
            <h2>
              Um painel claro.
              <br />
              Nenhum valor sem contexto.
            </h2>
            <p>
              Do resumo da rescisão à fórmula por trás de cada verba. Veja o que
              foi calculado, o que ainda precisa ser confirmado e onde pode
              haver uma diferença.
            </p>
            <ul className="feature-list">
              <li>
                <GitCompareArrows size={19} /> Pago e devido, lado a lado.
              </li>
              <li>
                <ShieldCheck size={19} /> Nível de confiança em cada verba.
              </li>
              <li>
                <FileText size={19} /> Relatório para consultar e compartilhar.
              </li>
            </ul>
            <Link href="/simular" className="text-link gold">
              Conferir minha rescisão <ArrowRight size={18} />
            </Link>
          </div>
        </section>
        <section id="planos" className="container section">
          <div className="center-heading">
            <p className="eyebrow">
              COMECE COM CLAREZA. ESCOLHA COM LIBERDADE.
            </p>
            <h2>O próximo passo é seu.</h2>
            <p>Simule de graça. Aprofunde a análise quando precisar.</p>
          </div>
          <Plans />
          <p className="pricing-footnote">
            <LockKeyhole size={14} /> Preço e recorrência sempre visíveis antes
            de confirmar.{" "}
            <Link href="/cancelamento">Conheça a política de reembolso.</Link>
          </p>
        </section>
        <section className="container social-placeholder">
          <span className="eyebrow">TRANSPARÊNCIA DESDE O PRIMEIRO DIA</span>
          <p>[depoimento real — inserir após os primeiros casos]</p>
          <span>A confiança será construída com experiências reais.</span>
        </section>
        <section className="container section faq-section">
          <div>
            <p className="eyebrow">SEM PONTAS SOLTAS</p>
            <h2>
              Você pergunta.
              <br />A gente esclarece.
            </h2>
            <p className="muted">Ainda ficou alguma dúvida?</p>
            <Link className="text-link" href="/contato">
              Fale com a VERBA.X <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="faq-list">
            {questions.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <Plus size={19} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="container final-cta">
          <span className="eyebrow">SEUS DIREITOS MERECEM CLAREZA</span>
          <h2>
            Confira o que pagaram.
            <br />
            <span className="gold">Entenda o que foi calculado.</span>
          </h2>
          <Link href="/simular" className="button primary large">
            Simular minha rescisão <ArrowUpRight size={19} />
          </Link>
          <p>Gratuito para começar. Transparente em cada etapa.</p>
        </section>
        <div className="container legal-line">
          Regras ilustrativas com fundamentos a confirmar. A análise não
          substitui avaliação jurídica quando necessária.
        </div>
      </main>
      <Footer />
    </LandingMotion>
  );
}
