import { redirect } from "next/navigation";
import { getUser } from "@/lib/server";
import { AuthForm } from "./auth-form";
export async function AuthPage({
  mode,
}: {
  mode: "login" | "cadastro" | "recuperar-senha" | "redefinir-senha";
}) {
  if ((mode === "login" || mode === "cadastro") && (await getUser()))
    redirect("/dashboard");
  return <AuthForm mode={mode} />;
}
