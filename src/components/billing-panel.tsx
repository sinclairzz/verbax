"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CreditCard, RotateCcw } from "lucide-react";
import { api, date, money } from "@/lib/api";
import type { Billing } from "@/lib/types";
import { PageHeading, ErrorMessage, Spinner } from "./ui";
import { Plans } from "./plans";

const status: Record<string, string> = {
  free: "Gratuito",
  active: "Ativo",
  canceled: "Cancelado",
  past_due: "Pagamento pendente",
  unpaid: "Não pago",
  pending: "Em confirmação",
  paid: "Pago",
  refunded: "Reembolsado",
  refund_pending: "Reembolso solicitado",
  refund_failed: "Reembolso precisa de suporte",
  expired: "Checkout expirado",
};
export function BillingPanel() {
  const router = useRouter();
  const [data, setData] = useState<Billing | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      setData(await api<Billing>("/billing"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function action(path: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await api<{ mensagem?: string }>(path, { method: "POST" });
      setMessage(
        res.mensagem || "Situação atualizada com o provedor de pagamento.",
      );
      await load();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="SEM SURPRESAS NA COBRANÇA"
        title="Seu plano, sob seu controle."
        description="Acompanhe pagamentos, cancele a renovação ou solicite reembolso."
      />
      <ErrorMessage message={error} />
      {message && (
        <div role="status" className="alert success">
          {message}
        </div>
      )}
      {!data ? (
        <Spinner />
      ) : (
        <div className="content-stack">
          <section className="panel">
            <div className="billing-summary">
              <div>
                <small>Plano atual</small>
                <strong>
                  {data.plano === "gratis"
                    ? "Grátis"
                    : data.plano === "avulso"
                      ? "Avulso"
                      : "Recorrente · R$ 27,90/mês"}
                </strong>
              </div>
              <div>
                <small>Situação</small>
                <strong>{status[data.status] || data.status}</strong>
              </div>
              <div>
                <small>
                  {data.cancelar_ao_final ? "Acesso até" : "Próxima cobrança"}
                </small>
                <strong>
                  {data.cancelar_ao_final && data.acesso_ate
                    ? date(data.acesso_ate)
                    : data.proxima_cobranca
                      ? date(data.proxima_cobranca)
                      : "Sem cobrança agendada"}
                </strong>
              </div>
            </div>
            <div className="billing-actions">
              <button
                className="button secondary small"
                onClick={() => action("/billing/sync")}
                disabled={busy}
              >
                <RefreshCw size={14} />
                Atualizar pagamento
              </button>
              {data.plano === "recorrente" &&
                data.status === "active" &&
                !data.cancelar_ao_final && (
                  <button
                    className="button secondary small"
                    disabled={busy}
                    onClick={() => action("/billing/cancel")}
                  >
                    Cancelar renovação mensal
                  </button>
                )}
            </div>
            {data.plano === "recorrente" &&
              !data.cancelar_ao_final &&
              data.status === "active" && (
                <p className="muted" style={{ fontSize: 12, marginTop: 20 }}>
                  Cobrança recorrente de R$ 27,90/mês no cartão até
                  cancelamento.
                </p>
              )}
          </section>
          {data.pagamentos.length > 0 && (
            <section className="panel">
              <div className="panel-title">
                <h2>Pagamentos e reembolsos</h2>
                <CreditCard size={17} />
              </div>
              <div className="table-scroll" tabIndex={0} role="region" aria-label="Tabela de pagamentos e reembolsos">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Plano / ambiente</th>
                      <th>Valor</th>
                      <th>Situação</th>
                      <th>Reembolso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pagamentos.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {p.plano === "avulso" ? "Avulso" : "Recorrente"}
                          <br />
                          <small className="muted">
                            {p.sandbox ? "Sandbox" : "Produção"} ·{" "}
                            {p.pago_em
                              ? date(p.pago_em)
                              : "Aguardando pagamento"}
                          </small>
                        </td>
                        <td>{money(p.valor_centavos / 100)}</td>
                        <td>{status[p.status] || p.status}</td>
                        <td>
                          {p.reembolsavel ? (
                            <>
                              <button
                                className="button secondary small"
                                disabled={busy}
                                onClick={() =>
                                  action(`/billing/refund/${p.id}`)
                                }
                              >
                                <RotateCcw size={13} />
                                Solicitar reembolso integral
                              </button>
                              <p
                                className="muted"
                                style={{ fontSize: 10, marginTop: 7 }}
                              >
                                Até {date(p.prazo_reembolso!)}. Sem
                                justificativa.
                              </p>
                            </>
                          ) : p.status === "refunded" ? (
                            "Reembolso confirmado"
                          ) : p.prazo_reembolso ? (
                            `Prazo encerrado em ${date(p.prazo_reembolso)}`
                          ) : (
                            "Disponível após confirmação"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted" style={{ fontSize: 11, marginTop: 20 }}>
                O reembolso da primeira contratação recorrente também encerra a
                assinatura. O crédito depende do prazo do emissor do cartão.
              </p>
            </section>
          )}
          <section>
            <div className="page-heading">
              <div>
                <h2 style={{ fontSize: 25 }}>
                  Escolha o que faz sentido para você.
                </h2>
                <p className="muted">Preços e condições, sempre por inteiro.</p>
              </div>
            </div>
            <Plans />
          </section>
        </div>
      )}
    </>
  );
}
