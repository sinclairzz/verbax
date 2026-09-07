import { AuthPage } from "@/components/auth-page";
export const metadata = {
  title: "Nova senha",
  description: "Defina uma nova senha para a sua conta.",
  robots: { index: false },
};
export default function Page() {
  return <AuthPage mode="redefinir-senha" />;
}
