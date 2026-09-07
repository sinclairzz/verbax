import { Dashboard } from "@/components/dashboard";
export const metadata = { title: "Meus casos" };
export default function Page() {
  return <Dashboard mode="history" />;
}
