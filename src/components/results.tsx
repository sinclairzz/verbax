"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Wallet,
  CircleDollarSign,
  TrendingUp,
  ChevronDown,
  LockKeyhole,
  Info,
  ShieldCheck,
} from "lucide-react";
import { money, confidence, downloadPdf, date } from "@/lib/api";
import type { Calculation, Case } from "@/lib/types";
import { ErrorMessage } from "./ui";

const colors = ["#74cbe9", "#739ce6", "#a698d4", "#7dbaab", "#b48b96"];
export function Metrics({ calculation }: { calculation?: Calculation }) {
  const metrics = [
    {
      label: "Valor devido ao trabalhador",
      value: calculation?.total_devido,
      hint: "Apurado pelas regras do motor",
      icon: CircleDollarSign,
    },
    {
      label: "Valor pago",
      value: calculation?.total_pago,
      hint: "Total bruto informado por você",
      icon: Wallet,
    },
    {
      label: "Diferença apurada",
      value: calculation?.diferenca,
      hint:
        calculation && Number(calculation.diferenca) < 0
          ? "Pago acima do cálculo"
          : "Possível valor a receber",
      icon: TrendingUp,
    },
  ];
  return (
    <div className="metrics-grid">
      {metrics.map(({ label, value, hint, icon: Icon }, i) => (
        <article
          className={`metric-card ${i === 2 ? "difference" : ""}`}
          key={label}
        >
          <div className="metric-top">
            <span>{label}</span>
            <Icon />
          </div>
          <strong>{value !== undefined ? money(value) : "R$ —"}</strong>
          <p>
            {value !== undefined ? hint : "Aguardando seu primeiro cálculo"}
          </p>
        </article>
      ))}
    </div>
  );
}
export function ResultPanels({ calculation }: { calculation: Calculation }) {
  const total = Number(calculation.total_devido);
  let offset = 0;
  return (
    <div className="dashboard-panels">
      <section className="panel">
        <div className="panel-title">
          <h2>Composição dos direitos</h2>
          <span>5 verbas</span>
        </div>
        {calculation.resultados.map((item, i) => (
          <div key={item.verba} className="composition-row">
            <div className="composition-name">
              <span className={`dot dot-${i}`} />
              {item.nome}
            </div>
            <div className="composition-value">
              <strong>{money(item.valor)}</strong>
              <span className={`confidence ${item.nivel_confianca}`}>
                <ShieldCheck size={10} />
                {confidence[item.nivel_confianca] || item.nivel_confianca}
              </span>
            </div>
          </div>
        ))}
      </section>
      <section className="panel">
        <div className="panel-title">
          <h2>Distribuição das verbas</h2>
          <span>Valores devidos</span>
        </div>
        <div className="donut-container">
          <div
            className="donut-chart"
            role="img"
            aria-label="Distribuição dos valores devidos. Percentuais disponíveis na legenda."
          >
            <svg viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="47"
                fill="none"
                stroke="#362a3f"
                strokeWidth="17"
              />
              {calculation.resultados.map((item, i) => {
                const percent = total > 0 ? Number(item.valor) / total : 0;
                const start = offset;
                offset += percent * 295.31;
                return (
                  <circle
                    key={item.verba}
                    cx="60"
                    cy="60"
                    r="47"
                    fill="none"
                    stroke={colors[i]}
                    strokeWidth="17"
                    strokeDasharray={`${percent * 295.31} ${295.31 - percent * 295.31}`}
                    strokeDashoffset={-start}
                  />
                );
              })}
            </svg>
            <div className="donut-center">
              <strong>{calculation.resultados.length}</strong>
              <small>verbas analisadas</small>
            </div>
          </div>
          <div className="chart-legend">
            {calculation.resultados.map((item, i) => (
              <div key={item.verba}>
                <span className={`dot dot-${i}`} />
                <span>
                  {item.nome
                    .replace(" indenizado", "")
                    .replace(" proporcionais", "")}
                </span>
                <span>
                  {total > 0
                    ? ((Number(item.valor) / total) * 100)
                        .toFixed(1)
                        .replace(".", ",")
                    : "0"}
                  %
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
export function PdfButton({
  caseId,
  complete,
}: {
  caseId: string;
  complete: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!complete)
    return (
      <Link
        href={`/checkout?plano=avulso&caso=${caseId}`}
        className="button secondary"
      >
        <LockKeyhole size={16} /> Liberar laudo PDF
      </Link>
    );
  async function download() {
    setBusy(true);
    setError("");
    try {
      await downloadPdf(caseId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button onClick={download} disabled={busy} className="button secondary">
        <ArrowDownToLine size={16} />
        {busy ? "Gerando PDF…" : "Baixar laudo PDF"}
      </button>
      <ErrorMessage message={error} />
    </div>
  );
}
export function Memory({ item }: { item: Case }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>Memória de cálculo</h2>
        <span>Fórmulas e fundamentos</span>
      </div>
      {item.completo ? (
        <div className="memory-list">
          {item.calculo.resultados.map((row) => (
            <details key={row.verba}>
              <summary>
                <ChevronDown size={16} />
                <span>{row.nome}</span>
                <strong>{money(row.valor)}</strong>
              </summary>
              <div className="memory-content">
                <span className={`confidence ${row.nivel_confianca}`}>
                  {confidence[row.nivel_confianca]}
                </span>
                <code>{row.formula}</code>
                <dl>
                  {Object.entries(row.parametros || {}).map(([key, value]) => (
                    <div key={key} style={{ display: "contents" }}>
                      <dt>{key.replaceAll("_", " ")}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <p>{row.fundamento}</p>
                <p>
                  <a href={row.fonte_url} target="_blank" rel="noreferrer">
                    Consultar fonte oficial{" "}
                    <ArrowUpRight size={12} style={{ display: "inline" }} />
                  </a>
                </p>
                <p className="memory-footer">
                  Regra {row.versao_regra} · {date(row.data_calculo!)}.
                  Arredondamento decimal para centavos por verba. Os dados de
                  entrada e a versão ficam preservados.
                </p>
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="locked-panel">
          <LockKeyhole size={25} strokeWidth={1.4} />
          <h3>Entenda a origem de cada centavo.</h3>
          <p>
            A fórmula, os parâmetros, a fonte e a versão de cada regra estão na
            análise completa, junto com seu laudo em PDF.
          </p>
          <Link
            className="button primary"
            href={`/checkout?plano=avulso&caso=${item.id}`}
          >
            Ver planos e liberar análise <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
    </section>
  );
}
export function CaseDetail({ item }: { item: Case }) {
  return (
    <>
      <div className="case-context">
        <div>
          <strong>
            {item.nome} <span className="muted">· {item.cpf_mascarado}</span>
          </strong>
          <p>
            {item.dados.cargo} · {date(item.dados.admissao)} a{" "}
            {date(item.dados.demissao)}
            {item.dados.empregador && ` · ${item.dados.empregador}`}
          </p>
        </div>
        <span className="tag">Calculado em {date(item.criado_em)}</span>
      </div>
      <Metrics calculation={item.calculo} />
      <ResultPanels calculation={item.calculo} />
      <div className="dashboard-note">
        <Info size={18} />
        <p>
          <strong>O que estes números significam.</strong> {item.calculo.escopo}{" "}
          Fundamentos a confirmar. “Calculado” indica execução matemática, não
          validação jurídica.
        </p>
      </div>
      <div className="content-stack">
        <Memory item={item} />
        <section className="panel">
          <div className="panel-title">
            <h2>Pago × devido, por verba</h2>
            <span>Comparação detalhada</span>
          </div>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Comparação por verba, role horizontalmente para ver todas as colunas">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Verba</th>
                  <th>Devido</th>
                  <th>Pago</th>
                  <th>Diferença</th>
                </tr>
              </thead>
              <tbody>
                {item.calculo.divergencias.map((row) => (
                  <tr key={row.verba}>
                    <td>{row.nome}</td>
                    <td>{money(row.valor_devido)}</td>
                    <td>
                      {row.valor_pago === null
                        ? "Não informado"
                        : money(row.valor_pago)}
                    </td>
                    <td>
                      {row.diferenca === null
                        ? "Pendente"
                        : money(row.diferenca)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
