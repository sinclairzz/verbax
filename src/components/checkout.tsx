"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Check,
  CreditCard,
  ShieldCheck,
  ArrowUpRight,
  LoaderCircle,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Case, PublicConfig, User } from "@/lib/types";
import { ErrorMessage, PageHeading, Spinner } from "./ui";

export function Checkout({
  plan,
  caseId,
  canceled,
}: {
  plan: "avulso" | "recorrente";
  caseId?: string;
  canceled?: boolean;
}) {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [selected, setSelected] = useState(caseId || "");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  useEffect(() => {
    async function load() {
      try {
        setConfig(await api<PublicConfig>("/config"));
        try {
          setUser(await api<User>("/auth/me"));
          const rows = await api<Case[]>("/cases");
          setCases(rows);
          if (!caseId && rows.length) setSelected(rows[0].id);
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 401)) throw e;
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [caseId]);
  async function pay() {
    setBusy(true);
    setError("");
    try {
      if (!accepted)
        throw new Error("Confirme as condições do plano para continuar.");
      const response = await api<{ url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          plano: plan,
          caso_id: plan === "avulso" ? selected : null,
        }),
      });
      const target = new URL(response.url);
      if (
        target.protocol !== "https:" ||
        target.hostname !== "checkout.stripe.com"
      )
        throw new Error("O endereço de pagamento recebido não é válido.");
      window.location.assign(target.href);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="VOCÊ ESCOLHE. TUDO FICA CLARO."
        title="Seu próximo passo."
        description="Confira o plano e as condições antes de continuar."
      />
      <div className="checkout-switch">
        <Link
          href="/checkout?plano=avulso"
          className={plan === "avulso" ? "active" : ""}
        >
          Avulso · R$ 247,90
        </Link>
        <Link
          href="/checkout?plano=recorrente"
          className={plan === "recorrente" ? "active" : ""}
        >
          Recorrente · R$ 27,90/mês
        </Link>
      </div>
      {canceled && (
        <div className="alert info">
          O checkout foi interrompido. Nenhum acesso é liberado sem a
          confirmação do pagamento.
        </div>
      )}
      <div className="checkout-layout">
        <section className="checkout-summary">
          <div className="plan-top">
            <h2>{plan === "avulso" ? "Análise avulsa" : "Acesso contínuo"}</h2>
            {config?.sandbox && <span className="tag">Sandbox</span>}
          </div>
          <div className="plan-price">
            <span>R$</span> {plan === "avulso" ? "247" : "27"}
            <small>,90</small>
          </div>
          <p className="cadence">
            {plan === "avulso"
              ? "Pagamento único · um caso"
              : "Por mês · no cartão de crédito"}
          </p>
          <p className="plan-note">
            {plan === "avulso"
              ? "Sem cobrança recorrente."
              : "Cobrança recorrente de R$ 27,90 por mês, até cancelamento."}
          </p>
          <ul>
            {(plan === "avulso"
              ? [
                  "Cálculo completo de um caso",
                  "Memória de cálculo e fundamentos",
                  "Laudo detalhado em PDF",
                ]
              : [
                  "Acesso contínuo aos cálculos",
                  "Histórico completo de casos",
                  "Laudos em PDF e suporte",
                ]
            ).map((item) => (
              <li key={item}>
                <Check size={16} />
                {item}
              </li>
            ))}
          </ul>
          <div className="scope-note" style={{ marginTop: 28 }}>
            <ShieldCheck size={18} />
            <p>
              7 dias corridos para desistir da contratação, com reembolso
              integral.{" "}
              <Link href="/cancelamento" className="gold">
                Veja como funciona.
              </Link>
            </p>
          </div>
        </section>
        <div className="checkout-action">
          {loading ? (
            <Spinner />
          ) : (
            <section className="panel">
              <h2>Pagamento seguro.</h2>
              <p>
                Os dados do cartão são informados diretamente no Stripe. A
                VERBA.X não recebe nem armazena o número do seu cartão.
              </p>
              <ErrorMessage message={error} />
              {!user ? (
                <>
                  <Link className="button primary" href="/cadastro">
                    Criar conta para continuar <ArrowUpRight size={16} />
                  </Link>
                  <Link
                    href="/login"
                    className="button secondary"
                    style={{ marginTop: 12 }}
                  >
                    Já tenho conta
                  </Link>
                </>
              ) : plan === "avulso" && !cases.length ? (
                <>
                  <p>Crie seu caso antes de contratar a análise avulsa.</p>
                  <Link
                    href="/dashboard/novo-calculo"
                    className="button primary"
                  >
                    Criar meu caso <ArrowUpRight size={16} />
                  </Link>
                </>
              ) : (
                <>
                  {plan === "avulso" && (
                    <div className="field" style={{ marginBottom: 20 }}>
                      <label htmlFor="case-select">
                        Qual caso deseja analisar?
                      </label>
                      <select
                        id="case-select"
                        value={selected}
                        onChange={(e) => setSelected(e.target.value)}
                        required
                      >
                        <option value="">Selecione um caso</option>
                        {cases.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nome} · {item.cpf_mascarado}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <label
                    className="checkbox-label"
                    style={{ marginBottom: 23 }}
                  >
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                    />
                    <span>
                      {plan === "avulso"
                        ? "Confirmo o pagamento único de R$ 247,90 para este caso."
                        : "Entendo e autorizo a cobrança recorrente de R$ 27,90 por mês no cartão, até cancelamento."}{" "}
                      Li os <Link href="/termos-de-uso">Termos de Uso</Link> e a{" "}
                      <Link href="/cancelamento">política de reembolso</Link>.
                    </span>
                  </label>
                  <button
                    className="button primary"
                    onClick={pay}
                    disabled={
                      busy ||
                      !accepted ||
                      !config?.pagamentos_configurados ||
                      (plan === "avulso" && !selected)
                    }
                  >
                    {busy ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <CreditCard size={16} />
                    )}
                    Continuar para o{" "}
                    {config?.sandbox ? "Stripe de teste" : "Stripe"}
                  </button>
                </>
              )}
              {config && !config.pagamentos_configurados && (
                <div className="alert info">
                  Checkout sandbox aguardando configuração das chaves de teste
                  do Stripe. Nenhuma cobrança será feita aqui.
                </div>
              )}
              {config?.sandbox && (
                <p style={{ fontSize: 11, marginTop: 18, marginBottom: 0 }}>
                  Ambiente de teste. Não use um cartão real.
                </p>
              )}
            </section>
          )}
          <Link href="/dashboard" className="text-link">
            Voltar ao meu painel
          </Link>
        </div>
      </div>
    </>
  );
}
