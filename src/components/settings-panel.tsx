"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BrainCircuit,
  UsersRound,
  ShieldCheck,
  Send,
  Trash2,
} from "lucide-react";
import { useUser } from "./app-shell";
import { api } from "@/lib/api";
import { PageHeading, ErrorMessage } from "./ui";

export function SupportForm() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      const response = await api<{ protocolo: string }>("/support", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setMessage(`Solicitação registrada. Protocolo: ${response.protocolo}`);
      form.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <ErrorMessage message={error} />
      {message && (
        <div className="alert success" role="status">
          {message}
        </div>
      )}
      <div className="field">
        <label htmlFor="tipo">Como podemos ajudar?</label>
        <select id="tipo" name="tipo">
          <option value="suporte">Dúvida sobre o produto ou pagamento</option>
          <option value="privacidade">
            Solicitação sobre meus dados pessoais
          </option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="mensagem">Sua mensagem</label>
        <textarea
          id="mensagem"
          name="mensagem"
          required
          minLength={10}
          maxLength={5000}
          rows={4}
          placeholder="Conte o que você precisa. Não inclua senha ou dados do cartão."
        />
      </div>
      <button className="button primary" disabled={busy}>
        <Send size={16} />
        {busy ? "Registrando…" : "Registrar solicitação"}
      </button>
    </form>
  );
}
export function SettingsPanel() {
  const user = useUser();
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/account", {
        method: "DELETE",
        body: JSON.stringify(
          Object.fromEntries(new FormData(event.currentTarget)),
        ),
      });
      router.replace("/login");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="SUA CONTA, SUAS ESCOLHAS"
        title="Configurações."
        description="Gerencie seu acesso, fale com o suporte e controle seus dados."
      />
      <div className="settings-layout">
        <section className="panel">
          <h2>Seu perfil</h2>
          <div className="settings-row">
            <span className="muted">Nome</span>
            <span>{user.nome}</span>
          </div>
          <div className="settings-row">
            <span className="muted">E-mail</span>
            <span>{user.email}</span>
          </div>
          <div className="settings-row">
            <span className="muted">Experiência</span>
            <span>Modo Trabalhador</span>
          </div>
          <div className="billing-actions">
            <Link href="/recuperar-senha" className="button secondary small">
              Redefinir minha senha
            </Link>
            <Link href="/dashboard/plano" className="button secondary small">
              Gerenciar plano
            </Link>
          </div>
        </section>
        <section className="panel">
          <h2>Suporte e privacidade</h2>
          <p>
            Sua mensagem fica registrada com um protocolo. Para solicitações
            sobre dados, selecione a opção de privacidade.
          </p>
          <SupportForm />
        </section>
        <section className="panel">
          <h2>
            <ShieldCheck
              size={20}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: 8,
              }}
            />
            Seus dados são seus.
          </h2>
          <p>
            A exclusão remove sua conta, seus casos e seus dados pessoais da
            base ativa. A assinatura é encerrada. Registros do gateway seguem as
            obrigações dele. Solicite eventuais reembolsos antes de excluir a
            conta.
          </p>
          <Link href="/politica-de-privacidade" className="text-link gold">
            Entenda a retenção e a exclusão
          </Link>
          <ErrorMessage message={error} />
          {showDelete ? (
            <form
              onSubmit={remove}
              className="form-stack"
              style={{ marginTop: 25 }}
            >
              <div className="field">
                <label htmlFor="delete-email">Confirme seu e-mail</label>
                <input
                  name="email"
                  id="delete-email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="delete-password">Confirme sua senha</label>
                <input
                  name="senha"
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                />
              </div>
              <label className="checkbox-label">
                <input type="checkbox" required />
                <span>
                  Entendo que a exclusão da conta e dos casos não pode ser
                  desfeita.
                </span>
              </label>
              <div className="billing-actions">
                <button className="button danger-button" disabled={busy}>
                  {busy ? "Excluindo…" : "Excluir definitivamente"}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowDelete(false)}
                >
                  Manter minha conta
                </button>
              </div>
            </form>
          ) : (
            <div className="billing-actions">
              <button
                className="button secondary small"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 size={14} />
                Excluir minha conta e meus dados
              </button>
            </div>
          )}
        </section>
        <section>
          <h2 style={{ fontSize: 24, marginBottom: 20 }}>
            A plataforma está evoluindo.
          </h2>
          <div className="coming-grid">
            <article className="coming-card">
              <UsersRound size={25} />
              <h2>Novos modos</h2>
              <span className="tag">Em breve · módulos 01 e 11</span>
              <p>
                Modo Advogado, Contador/DP e multiempresa. O Modo Trabalhador é
                a experiência disponível agora.
              </p>
              <button className="button secondary small" disabled>
                Em breve
              </button>
            </article>
            <article className="coming-card">
              <BrainCircuit size={25} />
              <h2>Inteligência consultiva</h2>
              <span className="tag">Em breve · módulos 02, 03 e 09</span>
              <p>
                Documentos, extração e consulta jurídica com fontes. Jornada
                (06), normas coletivas (07) e administração (12) também estão
                planejadas.
              </p>
              <button className="button secondary small" disabled>
                Em breve
              </button>
            </article>
          </div>
        </section>
      </div>
    </>
  );
}
