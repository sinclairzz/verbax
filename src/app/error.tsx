"use client";
import { ErrorMessage } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="conteudo" className="container page-pad">
      <h1>Vamos tentar novamente?</h1>
      <ErrorMessage message="Não foi possível carregar esta página." />
      <button className="button primary" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
