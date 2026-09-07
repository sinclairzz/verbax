import Link from "next/link";
import {
  Scale,
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link
      href="/"
      className={`logo ${small ? "logo-small" : ""}`}
      aria-label="VERBA.X — página inicial"
    >
      <span className="logo-mark">
        <Scale size={23} strokeWidth={1.35} />
      </span>
      <span>
        VERBA<span className="logo-dot">.</span>
        <span className="gold">X</span>
      </span>
      <span className="logo-ai">AI</span>
    </Link>
  );
}
export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return diagonal ? <ArrowUpRight size={17} /> : <ArrowRight size={17} />;
}
export function Spinner({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={22} />
      <span>{label}</span>
    </div>
  );
}
export function ErrorMessage({ message }: { message?: string }) {
  return message ? (
    <div role="alert" className="alert error">
      <TriangleAlert size={18} />
      <span>{message}</span>
    </div>
  ) : null;
}
export function ScopeNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`scope-note ${compact ? "compact" : ""}`}>
      <ShieldCheck size={18} />
      <p>
        {compact
          ? "Regras ilustrativas · fundamentos a confirmar."
          : "Análise inicial com regras ilustrativas e fundamentos a confirmar. Os resultados dependem dos dados informados e não substituem avaliação jurídica quando necessária."}
      </p>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}
