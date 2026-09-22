import type { CookieMethodsServer } from "@supabase/ssr";

export function createCookieMethodsServer(
  getAll: CookieMethodsServer["getAll"],
  setAll: CookieMethodsServer["setAll"]
): CookieMethodsServer {
  return {
    getAll,
    setAll
  };
}
