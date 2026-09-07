import Link from "next/link";
import { Logo } from "@/components/ui";
export default function NotFound() {
  return (
    <main id="conteudo" className="empty-page">
      <Logo />
      <p className="eyebrow">404</p>
      <h1>Este caminho não existe.</h1>
      <Link className="button primary" href="/">
        Voltar ao início
      </Link>
    </main>
  );
}
