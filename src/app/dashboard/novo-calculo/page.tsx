import { PageHeading } from "@/components/ui";
import { CalculationForm } from "@/components/calculation-form";
export const metadata = { title: "Novo cálculo" };
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="UM NOVO PONTO DE PARTIDA"
        title="Vamos conferir seu contrato."
        description="Responda às perguntas abaixo. Você pode voltar e revisar antes de calcular."
      />
      <CalculationForm authenticated />
    </>
  );
}
