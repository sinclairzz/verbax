import Link from "next/link";
import { Check, ArrowUpRight } from "lucide-react";
const plans = [
  {
    name: "Grátis",
    price: "0",
    cents: "",
    cadence: "para começar",
    note: "Sem cartão. Sem compromisso.",
    items: [
      "Simulação das 5 verbas",
      "Comparação do total pago × devido",
      "Triagem inicial dos seus direitos",
    ],
    cta: "Simular gratuitamente",
    href: "/simular",
  },
  {
    name: "Avulso",
    price: "247",
    cents: ",90",
    cadence: "pagamento único",
    note: "Um caso, com todos os detalhes.",
    items: [
      "Cálculo completo de um caso",
      "Memória de cálculo com as fontes",
      "Laudo detalhado em PDF",
    ],
    cta: "Analisar meu caso",
    href: "/checkout?plano=avulso",
  },
  {
    name: "Recorrente",
    price: "27",
    cents: ",90",
    cadence: "/mês",
    note: "Cobrança mensal no cartão, até cancelamento.",
    items: [
      "Acesso contínuo aos cálculos",
      "Histórico completo de casos",
      "Laudos em PDF e suporte",
    ],
    cta: "Ter acesso contínuo",
    href: "/checkout?plano=recorrente",
  },
];
export function Plans() {
  return (
    <div className="plans-grid">
      {plans.map((plan, index) => (
        <article
          key={plan.name}
          className={`plan-card ${index === 2 ? "featured" : ""}`}
        >
          <div className="plan-top">
            <h3>{plan.name}</h3>
            {index === 2 && (
              <span className="tag gold-tag">Acesso contínuo</span>
            )}
          </div>
          <div className="plan-price">
            <span>R$</span> {plan.price}
            <small>{plan.cents}</small>
          </div>
          <p className="cadence">{plan.cadence}</p>
          <p className="plan-note">{plan.note}</p>
          <Link
            href={plan.href}
            className={`button ${index === 2 ? "primary" : "secondary"}`}
          >
            {plan.cta}
            <ArrowUpRight size={17} />
          </Link>
          <ul>
            {plan.items.map((item) => (
              <li key={item}>
                <Check size={16} />
                {item}
              </li>
            ))}
          </ul>
          {index > 0 && (
            <p className="plan-refund">
              7 dias para desistir, com reembolso integral.
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
