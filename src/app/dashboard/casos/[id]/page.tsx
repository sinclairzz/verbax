import { Dashboard } from "@/components/dashboard";
export const metadata = { title: "Análise do caso" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Dashboard mode="detail" id={id} />;
}
