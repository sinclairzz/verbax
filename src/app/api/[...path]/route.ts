import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const allowed =
  /^(health|config|auth\/(csrf|register|login|google|logout|me|forgot-password|reset-password)|simulate|cases(?:\/[a-f0-9-]+(?:\/pdf)?)?|billing(?:\/(checkout|sync|cancel|webhook|refund\/[a-f0-9-]+))?|support|account)$/;

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  if (!allowed.test(endpoint))
    return NextResponse.json(
      { detail: "Rota não encontrada." },
      { status: 404 },
    );
  const headers = new Headers();
  for (const key of [
    "content-type",
    "cookie",
    "x-csrf-token",
    "origin",
    "stripe-signature",
  ]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set(
    "x-verba-client-ip",
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local",
  );
  const body = ["GET", "HEAD"].includes(request.method)
    ? undefined
    : await request.arrayBuffer();
  if (body && body.byteLength > 65536)
    return NextResponse.json(
      { detail: "Requisição muito grande." },
      { status: 413 },
    );
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL || "http://127.0.0.1:8000"}/${endpoint}`,
      {
        method: request.method,
        headers,
        body,
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(30000),
      },
    );
    const outgoing = new Headers({ "Cache-Control": "no-store" });
    for (const key of ["content-type", "content-disposition", "retry-after"]) {
      const value = response.headers.get(key);
      if (value) outgoing.set(key, value);
    }
    for (const cookie of response.headers.getSetCookie())
      outgoing.append("set-cookie", cookie);
    return new Response(response.body, {
      status: response.status,
      headers: outgoing,
    });
  } catch {
    return NextResponse.json(
      {
        detail:
          "O serviço está indisponível no momento. Tente novamente em instantes.",
      },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as DELETE };
