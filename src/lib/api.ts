export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
let csrfToken: string | undefined;
async function csrf() {
  if (!csrfToken) {
    const response = await fetch("/api/auth/csrf", { cache: "no-store" });
    if (!response.ok)
      throw new ApiError(
        response.status,
        "Não foi possível conectar. Tente novamente.",
      );
    csrfToken = (await response.json()).token;
  }
  return csrfToken!;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.method && !["GET", "HEAD"].includes(options.method)) {
    headers.set("Content-Type", "application/json");
    headers.set("X-CSRF-Token", await csrf());
  }
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      0,
      "Sem conexão. Verifique sua internet e tente novamente.",
    );
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 403) csrfToken = undefined;
    const detail =
      data.erros
        ?.map((e: { mensagem: string }) =>
          e.mensagem.replace("Value error, ", ""),
        )
        .join(" ") || data.detail;
    throw new ApiError(
      response.status,
      typeof detail === "string"
        ? detail
        : "Não foi possível concluir. Tente novamente.",
    );
  }
  return response.json();
}
export async function downloadPdf(id: string) {
  const response = await fetch(`/api/cases/${id}/pdf`, { cache: "no-store" });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Não foi possível gerar o PDF.");
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `verba-x-${id.slice(0, 8)}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Formatting only: all monetary arithmetic and results come from the Python engine.
export const money = (value: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value),
  );
export const date = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(value.length === 10 ? `${value}T12:00:00` : value),
  );
export const confidence: Record<string, string> = {
  calculado: "Calculado",
  confirmado: "Confirmado",
  estimado: "Estimado",
  pendente: "Pendente",
  possivel_diferenca: "Possível diferença",
};
