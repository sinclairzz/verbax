"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Calculator,
  Check,
  LoaderCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Calculation, CalculationInput, Case, RuleKey } from "@/lib/types";
import { ErrorMessage, ScopeNote } from "./ui";
import { Metrics, ResultPanels } from "./results";

gsap.registerPlugin(useGSAP);

const ruleLabels: [RuleKey, string][] = [
  ["saldo_salario", "Saldo de salário"],
  ["aviso_previo", "Aviso prévio"],
  ["ferias", "Férias + 1/3"],
  ["decimo_terceiro", "13º proporcional"],
  ["fgts_multa", "Multa de 40% do FGTS"],
];
const starting: Record<string, string> = {
  nome: "",
  cpf: "",
  cargo: "",
  empregador: "",
  admissao: "",
  demissao: "",
  salario_base: "",
  anos_completos: "",
  dias_no_mes: "30",
  dias_trabalhados: "",
  meses_periodo: "",
  meses_no_ano: "",
  total_fgts_depositado: "",
  valor_pago: "",
};

export function CalculationForm({
  authenticated = false,
}: {
  authenticated?: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState(starting);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [breakdown, setBreakdown] = useState(false);
  const [scope, setScope] = useState(false);
  const [result, setResult] = useState<Calculation | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const wizardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const steps = authenticated
    ? ["Contrato", "Salário", "Direitos", "Comparação"]
    : ["Salário", "Direitos", "Comparação"];
  const stage = authenticated ? step : step + 1;

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const root = wizardRef.current;
      if (!root) return;
      const visible = result
        ? root.querySelectorAll(".simulation-results > *")
        : root.querySelectorAll(
            ".form-panel h2, .form-panel > p, .form-panel .alert, .form-panel .field, .form-panel .checkbox-label, .form-panel .scope-note, .form-actions",
          );
      if (visible.length)
        gsap.fromTo(
          visible,
          { autoAlpha: 0, y: 14 },
          {
            autoAlpha: 1,
            y: 0,
            duration: result ? 0.55 : 0.42,
            stagger: result ? 0.06 : 0.045,
            ease: "power2.out",
            clearProps: "opacity,transform,visibility",
          },
        );
      const active = root.querySelector(".wizard-step.active");
      if (active) {
        gsap.fromTo(
          active,
          { opacity: 0.55 },
          { opacity: 1, duration: 0.35, ease: "power2.out" },
        );
        gsap.fromTo(
          active.querySelector(":scope > span:first-child"),
          { scale: 0.78 },
          { scale: 1, duration: 0.45, ease: "back.out(2)" },
        );
      }
    },
    { scope: wizardRef, dependencies: [stage, result] },
  );
  useEffect(() => {
    if (!authenticated) return;
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("verba-simulation") || "null",
      );
      if (saved && Date.now() - saved.at < 3600000)
        setValues((v) => ({
          ...v,
          ...Object.fromEntries(
            Object.entries(saved.input)
              .filter(([key]) => key in starting)
              .map(([key, value]) => [key, String(value)]),
          ),
        }));
    } catch {
      /* Ignore expired/corrupted local draft. */
    }
  }, [authenticated]);
  function change(key: string, value: string) {
    setValues((old) => {
      const next = { ...old, [key]: value };
      if (
        authenticated &&
        (key === "admissao" || key === "demissao") &&
        next.admissao &&
        next.demissao
      ) {
        const a = new Date(`${next.admissao}T12:00:00`),
          d = new Date(`${next.demissao}T12:00:00`);
        const years =
          d.getFullYear() -
          a.getFullYear() -
          (d.getMonth() < a.getMonth() ||
          (d.getMonth() === a.getMonth() && d.getDate() < a.getDate())
            ? 1
            : 0);
        next.anos_completos = String(Math.max(0, years));
        next.dias_no_mes = String(
          new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
        );
      }
      return next;
    });
  }
  function field(
    key: string,
    label: string,
    options: {
      type?: string;
      hint?: string;
      min?: number;
      max?: number;
      required?: boolean;
      currency?: boolean;
      wide?: boolean;
      readOnly?: boolean;
    } = {},
  ) {
    const input = (
      <input
        id={key}
        name={key}
        type={options.type || (options.currency ? "number" : "text")}
        value={values[key] || ""}
        onChange={(e) => change(key, e.target.value)}
        required={options.required !== false}
        min={options.min ?? (options.currency ? 0 : undefined)}
        max={options.max ?? (options.currency ? 999999999.99 : undefined)}
        step={
          options.currency
            ? "0.01"
            : options.type === "number"
              ? "1"
              : undefined
        }
        placeholder={options.currency ? "0,00" : undefined}
        readOnly={options.readOnly}
        autoComplete={key === "nome" ? "name" : "off"}
        maxLength={options.type === "password" ? 11 : 160}
        inputMode={
          options.type === "password"
            ? "numeric"
            : options.currency
              ? "decimal"
              : options.type === "number"
                ? "numeric"
                : undefined
        }
        aria-describedby={options.hint ? `${key}-hint` : undefined}
      />
    );
    return (
      <div className={`field ${options.wide ? "span-two" : ""}`} key={key}>
        <label htmlFor={key}>{label}</label>
        {options.currency ? (
          <div className="input-prefix">
            <span>R$</span>
            {input}
          </div>
        ) : (
          input
        )}
        {options.hint && <small id={`${key}-hint`}>{options.hint}</small>}
      </div>
    );
  }
  function move(next: number) {
    setStep(next);
    setError("");
    requestAnimationFrame(() => headingRef.current?.focus());
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (step < steps.length - 1) {
      if (stage === 0 && values.demissao < values.admissao)
        return setError("A demissão deve ocorrer depois da admissão.");
      if (
        stage === 1 &&
        Number(values.dias_trabalhados) > Number(values.dias_no_mes)
      )
        return setError("Dias trabalhados não podem superar os dias do mês.");
      move(step + 1);
      return;
    }
    if (!scope) return setError("Confirme se o escopo atende ao seu caso.");
    const input: CalculationInput = {
      salario_base: values.salario_base,
      dias_no_mes: Number(values.dias_no_mes),
      dias_trabalhados: Number(values.dias_trabalhados),
      anos_completos: Number(values.anos_completos),
      meses_periodo: Number(values.meses_periodo),
      meses_no_ano: Number(values.meses_no_ano),
      total_fgts_depositado: values.total_fgts_depositado,
      valor_pago: values.valor_pago,
      motivo: "sem_justa_causa",
      aviso: "indenizado",
    };
    if (breakdown)
      input.pagos_por_verba = Object.fromEntries(
        ruleLabels.map(([key]) => [key, values[`pago_${key}`]]),
      ) as Record<RuleKey, string>;
    setBusy(true);
    try {
      if (authenticated) {
        const item = await api<Case>("/cases", {
          method: "POST",
          body: JSON.stringify({
            nome: values.nome,
            cpf: values.cpf,
            cargo: values.cargo,
            empregador: values.empregador,
            admissao: values.admissao,
            demissao: values.demissao,
            calculo: input,
          }),
        });
        sessionStorage.removeItem("verba-simulation");
        router.push(`/dashboard/casos/${item.id}`);
        router.refresh();
      } else {
        const calculation = await api<Calculation>("/simulate", {
          method: "POST",
          body: JSON.stringify(input),
        });
        setResult(calculation);
        sessionStorage.setItem(
          "verba-simulation",
          JSON.stringify({ at: Date.now(), input }),
        );
        requestAnimationFrame(() =>
          document.getElementById("simulation-heading")?.focus(),
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <div ref={wizardRef} className="simulation-results">
        <div>
          <p className="eyebrow">SUA SIMULAÇÃO ESTÁ PRONTA</p>
          <h2 id="simulation-heading" tabIndex={-1}>
            Agora você tem um ponto de partida.
          </h2>
        </div>
        <Metrics calculation={result} />
        <ResultPanels calculation={result} />
        <ScopeNote />
        <div className="dashboard-note">{result.escopo}</div>
        <div className="simulation-cta">
          <div>
            <h2>Guarde sua análise.</h2>
            <p>
              Crie sua conta gratuita e complete os dados do contrato para
              salvar o caso.
            </p>
          </div>
          <div>
            <button
              className="button secondary"
              onClick={() => setResult(null)}
            >
              Ajustar dados
            </button>
            <Link href="/cadastro" className="button primary">
              Criar conta e salvar <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </div>
    );
  return (
      <div ref={wizardRef} className="wizard-layout">
      <div>
        <div
          className="wizard-progress"
          aria-label={`Etapa ${step + 1} de ${steps.length}`}
        >
          {steps.map((label, i) => (
            <div
              key={label}
              className={`wizard-step ${i === step ? "active" : ""}`}
              aria-current={i === step ? "step" : undefined}
            >
              <span>{i < step ? <Check size={12} /> : i + 1}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <form
          ref={formRef}
          onSubmit={submit}
          className="form-panel"
          aria-busy={busy}
        >
          <h2 ref={headingRef} tabIndex={-1}>
            {
              [
                "Vamos conhecer seu contrato.",
                "Começando pelo seu salário.",
                "Agora, seus direitos proporcionais.",
                "O que você recebeu?",
              ][stage]
            }
          </h2>
          <p>
            {
              [
                "Seus dados ficam privados e seu CPF será exibido mascarado.",
                "Use o salário bruto, antes dos descontos.",
                "Você encontra estes dados no termo de rescisão e no extrato do FGTS.",
                "Informe o total bruto pago nas cinco verbas analisadas.",
              ][stage]
            }
          </p>
          <ErrorMessage message={error} />
          <div className="fields-grid">
            {stage === 0 && (
              <>
                {field("nome", "Nome do trabalhador", { wide: true })}
                {field("cpf", "CPF", {
                  type: "password",
                  hint: "Digite 11 números. Os dígitos ficam ocultos por segurança.",
                })}
                {field("cargo", "Qual era o seu cargo?")}
                {field("empregador", "Nome da empresa (opcional)", {
                  required: false,
                  wide: true,
                })}
                {field("admissao", "Quando você começou?", { type: "date" })}
                {field("demissao", "Quando o contrato terminou?", {
                  type: "date",
                })}
              </>
            )}
            {stage === 1 && (
              <>
                {field("salario_base", "Qual era seu salário bruto mensal?", {
                  currency: true,
                  min: 0.01,
                  wide: true,
                  hint: "Informe somente o salário base. Adicionais e médias não são calculados nesta versão.",
                })}
                {field(
                  "anos_completos",
                  "Quantos anos completos você trabalhou lá?",
                  {
                    type: "number",
                    min: 0,
                    max: 80,
                    readOnly: authenticated,
                    hint: authenticated
                      ? "Calculado a partir das datas do contrato."
                      : "Não conte o ano que ficou incompleto.",
                  },
                )}
                {field("dias_no_mes", "Quantos dias tem o mês da demissão?", {
                  type: "number",
                  min: 28,
                  max: 31,
                  readOnly: authenticated,
                })}
                {field(
                  "dias_trabalhados",
                  "Quantos dias você trabalhou no último mês?",
                  {
                    type: "number",
                    min: 0,
                    max: Number(values.dias_no_mes),
                    wide: true,
                    hint: "Considere os dias remunerados no mês da rescisão.",
                  },
                )}
              </>
            )}
            {stage === 2 && (
              <>
                {field(
                  "meses_periodo",
                  "Quantos meses contam para suas férias proporcionais?",
                  {
                    type: "number",
                    min: 0,
                    max: 12,
                    hint: "De 0 a 12, no período aquisitivo em aberto. Se não souber, confirme no termo de rescisão.",
                  },
                )}
                {field(
                  "meses_no_ano",
                  "Quantos meses contam para o 13º deste ano?",
                  {
                    type: "number",
                    min: 0,
                    max: 12,
                    hint: "De 0 a 12. A contagem dos avos e a projeção do aviso exigem conferência.",
                  },
                )}
                {field(
                  "total_fgts_depositado",
                  "Qual é o total depositado no FGTS deste contrato?",
                  {
                    currency: true,
                    wide: true,
                    hint: "Use o extrato do vínculo. O motor calcula apenas a multa de 40%; ele não soma o saldo do FGTS às verbas.",
                  },
                )}
                <div className="span-two">
                  <ScopeNote compact />
                </div>
              </>
            )}
            {stage === 3 && (
              <>
                {field(
                  "valor_pago",
                  "Quanto você recebeu nessas verbas, no total?",
                  {
                    currency: true,
                    wide: true,
                    hint: "Use o valor bruto: saldo salarial, aviso indenizado, férias proporcionais + 1/3, 13º proporcional e multa do FGTS. Não inclua saque do saldo do FGTS nem outras verbas.",
                  },
                )}
                <label className="checkbox-label span-two">
                  <input
                    type="checkbox"
                    checked={breakdown}
                    onChange={(e) => setBreakdown(e.target.checked)}
                  />
                  <span>
                    Tenho o detalhamento e quero informar o valor pago em cada
                    verba.
                  </span>
                </label>
                {breakdown &&
                  ruleLabels.map(([key, label]) =>
                    field(`pago_${key}`, label, { currency: true }),
                  )}
                <div className="span-two checkbox-section">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={scope}
                      onChange={(e) => setScope(e.target.checked)}
                      required
                    />
                    <span>
                      Meu caso é de{" "}
                      <strong>
                        demissão sem justa causa com aviso prévio indenizado
                      </strong>
                      . Entendo que esta análise usa regras ilustrativas a
                      confirmar e não inclui descontos, férias vencidas,
                      adicionais ou normas coletivas.
                    </span>
                  </label>
                </div>
              </>
            )}
          </div>
          <div className="form-actions">
            {step > 0 ? (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => move(step - 1)}
              >
                <ArrowLeft size={15} /> Voltar
              </button>
            ) : (
              <span className="muted" style={{ fontSize: 11 }}>
                Etapa 1 de {steps.length}
              </span>
            )}
            <button className="button primary" disabled={busy} type="submit">
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={16} />
                  Calculando…
                </>
              ) : step === steps.length - 1 ? (
                <>
                  <Calculator size={16} />
                  {authenticated ? "Calcular e salvar" : "Ver minha simulação"}
                </>
              ) : (
                <>
                  Continuar <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <aside className="wizard-aside">
        <h3>
          <ShieldCheck size={20} /> Você no controle.
        </h3>
        <p>
          O motor usa as informações que você fornece. Nenhum valor monetário é
          calculado por inteligência artificial.
        </p>
        <ul>
          <li>5 fórmulas determinísticas</li>
          <li>Parâmetros rastreáveis</li>
          <li>Regras com versão</li>
          <li>Fundamentos a confirmar</li>
        </ul>
        <p className="aside-bottom">
          Não sabe algum dado? Consulte seu termo de rescisão. Uma informação
          estimada pode mudar o resultado.
        </p>
      </aside>
    </div>
  );
}
