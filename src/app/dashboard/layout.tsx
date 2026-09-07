import { redirect } from "next/navigation";
import { getUser } from "@/lib/server";
import { AppShell } from "@/components/app-shell";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Meu painel",
  description: "Seu painel privado de auditoria trabalhista.",
  robots: { index: false, follow: false },
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  return <AppShell user={user}>{children}</AppShell>;
}
