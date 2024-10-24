import { createClient } from "@supabase/supabase-js";
import { Context } from "hono";

function createSupabaseClient(c: Context) {
  const supaClient = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);
  return supaClient;
}

export default createSupabaseClient;
