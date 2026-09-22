import type { CookieMethodsServer } from "@supabase/ssr";
import { createCookieMethodsServer } from "@/lib/supabase/cookie-adapter";

const getAll: CookieMethodsServer["getAll"] = () => [];
const setAll: CookieMethodsServer["setAll"] = () => undefined;

const cookieMethods: CookieMethodsServer = createCookieMethodsServer(getAll, setAll);

void cookieMethods;
