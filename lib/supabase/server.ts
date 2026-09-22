import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";
import { createCookieMethodsServer } from "./cookie-adapter";

export async function createClient() {
  const cookieStore = await cookies();

  const cookieMethods = createCookieMethodsServer(
    () => cookieStore.getAll(),
    (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      } catch {
        // Cookie writes from Server Components are handled by middleware.
      }
    }
  );

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    { cookies: cookieMethods }
  );
}
