import { AuthPage } from "@/components/auth-page";
export const metadata = {
  title: "Entrar",
  description: "Acesse sua conta e os seus casos na VERBA.X.",
  robots: { index: false },
};
export default function Page() {
  return <AuthPage mode="login" />;
}
