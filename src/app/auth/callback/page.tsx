"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { api } from "@/lib/api";
import { supabaseBrowser } from "@/lib/supabase";
import { Logo } from "@/components/ui";

export default function GoogleCallbackPage() {
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function finishLogin() {
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error_description");
      const code = params.get("code");
      window.history.replaceState(null, "", window.location.pathname);
      if (oauthError) throw new Error(oauthError);
      if (!code)
        throw new Error("O Google não devolveu um código de acesso válido.");

      const supabase = supabaseBrowser();
      const { data, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError || !data.session) {
        throw new Error(
          "Não foi possível validar sua conta Google. Tente novamente.",
        );
      }

      await api("/auth/google", {
        method: "POST",
        body: JSON.stringify({
          access_token: data.session.access_token,
          aceite: true,
        }),
      });
      await supabase.auth.signOut({ scope: "local" });
      window.location.replace("/dashboard");
    }

    finishLogin().catch((reason: unknown) => {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível entrar com Google.",
      );
    });
  }, []);

  return (
    <main id="conteudo" className="oauth-callback">
      <Logo />
      <section className="oauth-callback-card" aria-live="polite">
        {error ? (
          <>
            <p className="eyebrow">ACESSO NÃO CONCLUÍDO</p>
            <h1>Não foi possível entrar.</h1>
            <p className="muted">{error}</p>
            <Link href="/login" className="button primary">
              Voltar ao login
            </Link>
          </>
        ) : (
          <>
            <LoaderCircle className="spin gold" size={28} aria-hidden="true" />
            <h1>Validando seu acesso…</h1>
            <p className="muted">Isso leva apenas alguns segundos.</p>
          </>
        )}
      </section>
    </main>
  );
}
