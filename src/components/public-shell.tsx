"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Arrow, Logo } from "./ui";

export function Header() {
  return (
    <header className="public-header">
      <div className="container nav-inner">
        <Logo />
        <nav aria-label="Navegação principal" className="nav-links">
          <Link href="/#como-funciona">Como funciona</Link>
          <Link href="/#confianca">Nosso método</Link>
          <Link href="/#planos">Planos</Link>
        </nav>
        <div className="nav-actions">
          <Link href="/login" className="customer-link">
            Já sou cliente
          </Link>
          <Link href="/simular" className="button primary small">
            Simular gratuitamente <Arrow />
          </Link>
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="public-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Logo />
            <p>
              Clareza para conferir.
              <br />
              Confiança para decidir.
            </p>
          </div>
          <Link href="/simular" className="button secondary">
            Simular gratuitamente <Arrow />
          </Link>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} VERBA.X</p>
          <nav aria-label="Links legais">
            <Link href="/termos-de-uso">Termos de uso</Link>
            <Link href="/politica-de-privacidade">Privacidade</Link>
            <Link href="/cancelamento">Cancelamento e reembolso</Link>
            <Link href="/contato">Contato</Link>
            <button
              className="text-button"
              onClick={() => window.dispatchEvent(new Event("cookie-settings"))}
            >
              Cookies
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
export function Cookies() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(!localStorage.getItem("verba-cookie-consent"));
    const open = () => setVisible(true);
    window.addEventListener("cookie-settings", open);
    return () => window.removeEventListener("cookie-settings", open);
  }, []);
  function choose(value: string) {
    localStorage.setItem("verba-cookie-consent", value);
    setVisible(false);
  }
  if (!visible) return null;
  return (
    <section className="cookie-banner" aria-label="Preferências de cookies">
      <div>
        <strong>Sua privacidade, por princípio.</strong>
        <p>
          Usamos cookies essenciais para sua sessão e segurança. Não usamos
          publicidade ou analytics.{" "}
          <Link href="/politica-de-privacidade">Entenda nossa política.</Link>
        </p>
      </div>
      <div className="cookie-buttons">
        <button
          className="button secondary small"
          onClick={() => choose("essential")}
        >
          Somente essenciais
        </button>
        <button
          className="button primary small"
          onClick={() => choose("accepted")}
        >
          Aceitar
        </button>
      </div>
    </section>
  );
}
