import Link from "next/link";
import { Check, ArrowUpRight, MessageCircle } from "lucide-react";
import { freeConsultationUrl } from "@/lib/contact";

const publicPlans = [
  {
    name: "Free",
    price: "0",
    cents: "",
    cadence: "1 consulta gratuita",
    note: "Atendimento inicial pelo WhatsApp, sem cartão.",
    items: [
      "Uma consulta inicial gratuita",
      "Orientação para entender os próximos passos",
      "Atendimento direto com o Cícero",
    ],
    cta: "Falar com o Cícero",
    href: freeConsultationUrl,
    external: true,
  },
  {
    name: "PRO",
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
    href: "/cadastro",
    external: false,
  },
];

const accountPlans = [
  {
    ...publicPlans[1],
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
    external: false,
  },
];

export function Plans({
  context = "public",
}: {
  context?: "public" | "account";
}) {
  const plans = context === "account" ? accountPlans : publicPlans;
  return (
    <div className="plans-grid">
      {plans.map((plan, index) => {
        const featured = index === plans.length - 1;
        return (
          <article
            key={plan.name}
            className={`plan-card ${featured ? "featured" : ""}`}
          >
            <div className="plan-top">
              <h3>{plan.name}</h3>
              {featured && <span className="tag gold-tag">Mais completo</span>}
            </div>
            <div className="plan-price">
              <span>R$</span> {plan.price}
              <small>{plan.cents}</small>
            </div>
            <p className="cadence">{plan.cadence}</p>
            <p className="plan-note">{plan.note}</p>
            <Link
              href={plan.href}
              className={`button ${featured ? "primary" : "secondary"}`}
              target={plan.external ? "_blank" : undefined}
              rel={plan.external ? "noreferrer" : undefined}
            >
              {plan.external ? <MessageCircle size={17} /> : null}
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
            {context === "account" && (
              <p className="plan-refund">
                7 dias para desistir, com reembolso integral.
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
