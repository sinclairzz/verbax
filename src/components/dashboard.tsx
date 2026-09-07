"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Calculator,
  Check,
  ArrowUpRight,
  FolderOpen,
  FileText,
} from "lucide-react";
import { api, ApiError, date, money } from "@/lib/api";
import type { Case } from "@/lib/types";
import { useUser } from "./app-shell";
import { PageHeading, ErrorMessage, Spinner, ScopeNote } from "./ui";
import { CaseDetail, Metrics, PdfButton } from "./results";

export function Dashboard({
  mode = "overview",
  id,
}: {
  mode?: "overview" | "history" | "reports" | "detail";
  id?: string;
}) {
  const user = useUser();
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(false);
  async function load() {
    setBusy(true);
    setError("");
    try {
      if (id) {
        setCases([await api<Case>(`/cases/${id}`)]);
      } else {
        setCases(await api<Case[]>("/cases"));
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
    setDraft(Boolean(sessionStorage.getItem("verba-simulation")));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const selected = cases[0];
  const title =
    mode === "history"
      ? "Meus casos"
      : mode === "reports"
        ? "Seus relatórios"
        : mode === "detail"
          ? "Resumo do cálculo"
          : `Olá, ${user.nome.split(" ")[0]}.`;
  return (
    <>
      <PageHeading
        eyebrow={
          mode === "overview"
            ? "SEUS DIREITOS, EM PERSPECTIVA"
            : mode === "detail"
              ? "ANÁLISE DA RESCISÃO"
              : "SEU HISTÓRICO"
        }
        title={title}
        description={
          mode === "overview"
            ? "Clareza sobre sua rescisão começa aqui."
            : mode === "reports"
              ? "Cada análise completa pode ser levada com você."
              : mode === "history"
                ? "Consulte os casos disponíveis no seu plano."
                : "Cada verba com uma origem. Cada resultado com contexto."
        }
      >
        {mode === "detail" && selected ? (
          <PdfButton caseId={selected.id} complete={selected.completo} />
        ) : (
          <Link href="/dashboard/novo-calculo" className="button primary">
            <Plus size={16} />
            Novo cálculo
          </Link>
        )}
      </PageHeading>
      {busy ? (
        <Spinner label="Buscando seus casos…" />
      ) : error ? (
        <>
          <ErrorMessage message={error} />
          <button className="button secondary" onClick={load}>
            Tentar novamente
          </button>
        </>
      ) : (
        <>
          {draft && !selected && (
            <div className="alert info">
              Sua simulação está disponível nesta aba.{" "}
              <Link
                href="/dashboard/novo-calculo"
                style={{ textDecoration: "underline" }}
              >
                Complete o contrato para salvá-la.
              </Link>
            </div>
          )}
          {!selected ? (
            <>
              {mode === "overview" && <Metrics />}
              <div className="empty-dashboard">
                <div className="empty-icon">
                  {mode === "reports" ? (
                    <FileText size={31} strokeWidth={1.2} />
                  ) : (
                    <Calculator size={31} strokeWidth={1.2} />
                  )}
                </div>
                <h2>
                  {mode === "reports"
                    ? "Seu primeiro laudo começa com um cálculo."
                    : "Vamos olhar para sua rescisão?"}
                </h2>
                <p>
                  Informe os dados do seu contrato. O motor calcula as cinco
                  verbas e mostra a diferença em relação ao que você recebeu.
                </p>
                <Link href="/dashboard/novo-calculo" className="button primary">
                  {draft
                    ? "Continuar minha simulação"
                    : "Criar meu primeiro caso"}
                  <ArrowUpRight size={17} />
                </Link>
                <div className="empty-points">
                  <span>
                    <Check size={12} />
                    Dados privados
                  </span>
                  <span>
                    <Check size={12} />
                    Cálculo determinístico
                  </span>
                  <span>
                    <Check size={12} />
                    Fórmulas rastreáveis
                  </span>
                </div>
              </div>
              <ScopeNote />
            </>
          ) : mode === "overview" || mode === "detail" ? (
            <>
              <CaseDetail item={selected} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 20,
                  marginTop: 25,
                  flexWrap: "wrap",
                }}
              >
                <ScopeNote compact />
                {mode === "overview" && (
                  <PdfButton
                    caseId={selected.id}
                    complete={selected.completo}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="content-stack">
              {!user.historico_completo && (
                <div className="dashboard-note">
                  <FolderOpen size={18} />
                  <p>
                    {user.caso_avulso_id
                      ? "Seu plano avulso dá acesso ao caso contratado."
                      : "No plano gratuito, você vê seu caso mais recente."}{" "}
                    <Link href="/dashboard/plano" className="gold">
                      Conheça o recorrente para acessar todo o histórico.
                    </Link>
                  </p>
                </div>
              )}
              <section className="panel">
                <div className="table-scroll" tabIndex={0} role="region" aria-label="Tabela de casos">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Trabalhador / caso</th>
                        <th>Criado em</th>
                        <th>Diferença</th>
                        <th>{mode === "reports" ? "Relatório" : "Ação"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cases.map((item) => (
                        <tr key={item.id}>
                          <td>
                            {item.nome}
                            <br />
                            <small className="muted">
                              {item.cpf_mascarado}
                            </small>
                          </td>
                          <td>{date(item.criado_em)}</td>
                          <td>{money(item.calculo.diferenca)}</td>
                          <td>
                            {mode === "reports" ? (
                              <PdfButton
                                caseId={item.id}
                                complete={item.completo}
                              />
                            ) : (
                              <Link href={`/dashboard/casos/${item.id}`}>
                                Ver análise
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <ScopeNote />
            </div>
          )}
        </>
      )}
    </>
  );
}
