import { Header, Footer } from "@/components/public-shell";
import { PageHeading } from "@/components/ui";
import { CalculationForm } from "@/components/calculation-form";
export const metadata = {
  title: "Simule sua rescisão gratuitamente",
  description:
    "Faça uma triagem de sua rescisão sem criar conta. Cinco regras determinísticas, comparação clara e nenhum cartão necessário.",
};
export default function Simular() {
  return (
    <>
      <Header />
      <main id="conteudo" className="container public-simulator">
        <PageHeading
          eyebrow="SEM CADASTRO. SEM CARTÃO."
          title="Vamos conferir sua rescisão?"
          description="Uma pergunta de cada vez. Seus valores serão calculados pelo motor da VERBA.X."
        />
        <CalculationForm />
      </main>
      <Footer />
    </>
  );
}
