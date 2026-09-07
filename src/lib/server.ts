import "server-only";
import { cookies } from "next/headers";
import type { User } from "./types";

export async function getUser(): Promise<User | null> {
  const jar = await cookies();
  if (!jar.get("verba_session")) return null;
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL || "http://127.0.0.1:8000"}/auth/me`,
      { headers: { cookie: jar.toString() }, cache: "no-store" },
    );
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}
