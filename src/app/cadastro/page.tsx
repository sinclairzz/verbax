import { AuthPage } from "@/components/auth-page";
export const metadata = {
  title: "Criar conta",
  description: "Crie sua conta gratuita para salvar suas análises de rescisão.",
  robots: { index: false },
};
export default function Page() {
  return <AuthPage mode="cadastro" />;
}
