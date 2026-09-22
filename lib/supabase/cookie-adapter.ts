import type { CookieMethodsServer, CookieOptions } from "@supabase/ssr";

export type ServerCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export function createCookieMethodsServer(
  getAll: CookieMethodsServer["getAll"],
  setAll: CookieMethodsServer["setAll"]
): CookieMethodsServer {
  return {
    getAll,
    setAll
  };
}
