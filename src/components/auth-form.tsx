"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowUpRight,
  LoaderCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { ErrorMessage, Logo } from "./ui";
import { ProductPreview } from "./product-preview";

type Mode = "login" | "cadastro" | "recuperar-senha" | "redefinir-senha";
const copy = {
  login: [
    "Bom ter você de volta.",
    "Entre para continuar de onde parou.",
    "Entrar na minha conta",
  ],
  cadastro: [
    "Um passo para ter clareza.",
    "Crie sua conta para salvar e acompanhar seus casos.",
    "Criar minha conta",
  ],
  "recuperar-senha": [
    "Vamos recuperar seu acesso.",
    "Informe seu e-mail. Enviaremos um link seguro para redefinir sua senha.",
    "Enviar link de recuperação",
  ],
  "redefinir-senha": [
    "Uma nova senha. Um novo acesso.",
    "Escolha uma senha com pelo menos 10 caracteres.",
    "Salvar nova senha",
  ],
};
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [token, setToken] = useState("");
  useEffect(() => {
    if (mode === "redefinir-senha") {
      setToken(
        new URLSearchParams(window.location.hash.slice(1)).get("token") || "",
      );
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [mode]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === "recuperar-senha") {
        const response = await api<{ mensagem: string }>(
          "/auth/forgot-password",
          { method: "POST", body: JSON.stringify({ email: data.email }) },
        );
        setMessage(response.mensagem);
      } else if (mode === "redefinir-senha") {
        if (!token)
          throw new Error(
            "Link inválido. Solicite um novo e-mail de recuperação.",
          );
        const response = await api<{ mensagem: string }>(
          "/auth/reset-password",
          {
            method: "POST",
            body: JSON.stringify({ token, senha: data.senha }),
          },
        );
        setMessage(response.mensagem);
      } else {
        await api(mode === "login" ? "/auth/login" : "/auth/register", {
          method: "POST",
          body: JSON.stringify({ ...data, aceite: data.aceite === "on" }),
        });
        router.replace("/dashboard");
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="conteudo" className="auth-layout">
      <aside className="auth-story">
        <Logo />
        <div className="auth-story-content">
          <p className="eyebrow">SEU TRABALHO TEM VALOR.</p>
          <h1>
            Seus direitos merecem{" "}
            <span className="gold">uma explicação clara.</span>
          </h1>
          <p>
            Um espaço para conferir sua rescisão, entender cada cálculo e
            decidir com informação.
          </p>
          <ProductPreview />
        </div>
        <p className="auth-story-footer">
          Fato. Cálculo. Interpretação. Cada coisa no seu lugar.
        </p>
      </aside>
      <section className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-logo">
            <Logo />
          </div>
          <Link
            href={
              mode === "recuperar-senha" || mode === "redefinir-senha"
                ? "/login"
                : "/"
            }
            className="auth-back"
          >
            <ArrowLeft size={14} />
            {mode.includes("senha") ? "Voltar para entrar" : "Voltar ao início"}
          </Link>
          <p className="eyebrow">SEU ESPAÇO VERBA.X</p>
          <h2>{copy[mode][0]}</h2>
          <p className="muted">{copy[mode][1]}</p>
          <ErrorMessage message={error} />
          {message ? (
            <>
              <div className="alert success" role="status">
                {message}
              </div>
              <Link href="/login" className="button primary">
                Ir para o login
              </Link>
            </>
          ) : (
            <form onSubmit={submit} className="form-stack" aria-busy={busy}>
              {mode === "cadastro" && (
                <div className="field">
                  <label htmlFor="nome">Seu nome</label>
                  <input
                    id="nome"
                    name="nome"
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    placeholder="Como podemos chamar você?"
                  />
                </div>
              )}
              {mode !== "redefinir-senha" && (
                <div className="field">
                  <label htmlFor="email">E-mail</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                  />
                </div>
              )}
              {mode !== "recuperar-senha" && (
                <div className="field">
                  <label htmlFor="senha">
                    {mode === "redefinir-senha" ? "Nova senha" : "Senha"}
                  </label>
                  <div className="password-wrap">
                    <input
                      id="senha"
                      name="senha"
                      type={visible ? "text" : "password"}
                      minLength={mode === "login" ? 1 : 10}
                      maxLength={128}
                      required
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      placeholder={
                        mode === "login"
                          ? "Sua senha"
                          : "Pelo menos 10 caracteres"
                      }
                    />
                    <button
                      type="button"
                      aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              )}
              {mode === "login" && (
                <Link href="/recuperar-senha" className="auth-forgot">
                  Esqueci minha senha
                </Link>
              )}
              {mode === "cadastro" && (
                <label className="checkbox-label">
                  <input type="checkbox" name="aceite" required />
                  <span>
                    Li e aceito os{" "}
                    <Link href="/termos-de-uso" target="_blank">
                      Termos de Uso
                    </Link>{" "}
                    e a{" "}
                    <Link href="/politica-de-privacidade" target="_blank">
                      Política de Privacidade
                    </Link>
                    .
                  </span>
                </label>
              )}
              <button type="submit" disabled={busy} className="button primary">
                {busy ? (
                  <>
                    <LoaderCircle className="spin" size={17} /> Aguarde…
                  </>
                ) : (
                  <>
                    {copy[mode][2]} <ArrowUpRight size={17} />
                  </>
                )}
              </button>
            </form>
          )}
          {mode === "login" && (
            <p className="auth-bottom">
              Ainda não tem conta?{" "}
              <Link href="/cadastro">Criar conta gratuita</Link>
            </p>
          )}
          {mode === "cadastro" && (
            <p className="auth-bottom">
              Já tem conta? <Link href="/login">Entrar</Link>
            </p>
          )}
          <p className="auth-legal">
            Seus dados ficam protegidos. O CPF é sempre mascarado nas telas.
            <br />
            <Link href="/politica-de-privacidade">
              Saiba mais sobre sua privacidade.
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
