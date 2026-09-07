import { Header, Footer } from "@/components/public-shell";
import { Checkout } from "@/components/checkout";
import { getUser } from "@/lib/server";
import { redirect } from "next/navigation";
export const metadata = {
  title: "Escolha seu plano",
  description:
    "Preço e recorrência claros: R$ 247,90 por um caso ou R$ 27,90 por mês. Checkout seguro com Stripe.",
  robots: { index: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string; caso?: string; cancelado?: string }>;
}) {
  const params = await searchParams;
  if (params.plano === "recorrente" && !(await getUser())) redirect("/login");
  return (
    <>
      <Header />
      <main id="conteudo" className="container checkout-page">
        <Checkout
          plan={params.plano === "recorrente" ? "recorrente" : "avulso"}
          caseId={params.caso}
          canceled={params.cancelado === "1"}
        />
      </main>
      <Footer />
    </>
  );
}
