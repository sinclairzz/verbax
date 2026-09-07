"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calculator,
  History,
  FileText,
  Files,
  BrainCircuit,
  Settings,
  LogOut,
  UserRound,
  ChevronRight,
  Menu,
  X,
  ArrowUpRight,
  Scale,
  Clock3,
} from "lucide-react";
import type { User } from "@/lib/types";
import { api } from "@/lib/api";
import { Logo, ScopeNote, ErrorMessage } from "./ui";

const UserContext = createContext<User | null>(null);
export const useUser = () => useContext(UserContext)!;
const links = [
  { href: "/dashboard", name: "Visão geral", icon: LayoutDashboard },
  { href: "/dashboard/novo-calculo", name: "Novo cálculo", icon: Calculator },
  { href: "/dashboard/historico", name: "Meus casos", icon: History },
  { href: "/dashboard/relatorios", name: "Relatórios", icon: FileText },
];

export function AppShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [mobile, setMobile] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 800px)');
    const update = () => { setMobile(query.matches); if (!query.matches) setOpen(false); };
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!open || !mobile) return;
    const targets = () => Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') || []);
    targets()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); menuRef.current?.focus(); }
      if (event.key !== 'Tab') return;
      const elements = targets(); const first = elements[0]; const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [open, mobile]);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        router.push("/dashboard/novo-calculo");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [router]);
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const title =
    links.find((l) => l.href === path)?.name ||
    (path.includes("/casos/")
      ? "Análise do caso"
      : path.includes("/plano")
        ? "Meu plano"
        : "Configurações");
  return (
    <UserContext.Provider value={user}>
      <div className="app-layout">
        <button
          className={`mobile-overlay ${open ? "open" : ""}`}
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
          tabIndex={open ? 0 : -1}
        />
        <aside
          ref={sidebarRef}
          inert={mobile && !open}
          className={`sidebar ${open ? "open" : ""}`}
          aria-label="Menu do aplicativo"
        >
          <button
            className="icon-button mobile-sidebar-close"
            aria-label="Fechar navegação"
            onClick={() => setOpen(false)}
          >
            <X size={15} />
          </button>
          <Logo small />
          <div className="mode-label">
            <UserRound size={14} />
            <span>Modo Trabalhador</span>
          </div>
          <p className="sidebar-label">SEU ESPAÇO</p>
          <nav className="side-nav" aria-label="Área do trabalhador">
            {links.map(({ href, name, icon: Icon }) => (
              <Link
                href={href}
                key={href}
                className={path === href ? "active" : ""}
                aria-current={path === href ? "page" : undefined}
              >
                <Icon />
                {name}
              </Link>
            ))}
          </nav>
          <div className="sidebar-divider" />
          <p className="sidebar-label">EXPANDA SUA ANÁLISE</p>
          <div className="side-nav">
            {[
              { name: "Documentos", icon: Files },
              { name: "IA consultiva", icon: BrainCircuit },
              { name: "Normas coletivas", icon: Scale },
              { name: "Jornada e adicionais", icon: Clock3 },
            ].map(({ name, icon: Icon }) => (
              <button key={name} className="soon" disabled>
                <Icon />
                {name}
                <small>Em breve</small>
              </button>
            ))}
          </div>
          <div className="sidebar-bottom">
            <div className="mini-plan">
              <p>
                {user.historico_completo
                  ? "Seu acesso é contínuo."
                  : user.caso_avulso_id
                    ? "Seu caso completo."
                    : "Mais clareza em cada detalhe."}
              </p>
              <span>
                {user.historico_completo
                  ? "Cálculos, laudos e todo seu histórico."
                  : "Acesse a memória de cálculo e seu laudo em PDF."}
              </span>
              <Link href="/dashboard/plano">
                {user.historico_completo || user.caso_avulso_id
                  ? "Gerenciar meu plano"
                  : "Conhecer os planos"}
                <ArrowUpRight size={13} />
              </Link>
            </div>
            <nav className="side-nav" aria-label="Conta">
              <Link
                href="/dashboard/configuracoes"
                className={path.includes("configuracoes") ? "active" : ""}
              >
                <Settings />
                Configurações
              </Link>
            </nav>
            <div className="user-menu">
              <span className="avatar">
                {user.nome.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{user.nome}</strong>
                <small>
                  {user.historico_completo
                    ? "Plano recorrente"
                    : user.caso_avulso_id
                      ? "Plano avulso"
                      : "Plano gratuito"}
                </small>
              </div>
              <button
                className="icon-button"
                aria-label="Sair da conta"
                onClick={logout}
              >
                <LogOut size={15} />
              </button>
            </div>
            <ErrorMessage message={error} />
          </div>
        </aside>
        <div className="app-body" inert={mobile && open}>
          <header className="app-header">
            <button
              ref={menuRef}
              className="icon-button mobile-menu-button"
              aria-label="Abrir menu de navegação"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <Menu size={18} />
            </button>
            <div className="breadcrumb">
              <span>Seu espaço</span>
              <ChevronRight size={12} />
              <span>{title}</span>
            </div>
            <div className="app-header-actions">
              <ScopeNote compact />
              <span className="tag">Modo Trabalhador</span>
            </div>
          </header>
          <main id="conteudo" className="app-main">
            {children}
          </main>
        </div>
      </div>
    </UserContext.Provider>
  );
}
