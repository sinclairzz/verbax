import { AuthPage } from "@/components/auth-page";
export const metadata = {
  title: "Recuperar senha",
  description: "Recupere com segurança o acesso à sua conta.",
  robots: { index: false },
};
export default function Page() {
  return <AuthPage mode="recuperar-senha" />;
}
