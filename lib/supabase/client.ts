import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = "https://cdgmymahocwhugcllbxl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5z3OC8G8OYsqlJpFaFig-w_Xr9wrapJ";

export function createClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );
}
