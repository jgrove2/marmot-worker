import {
  createClient,
  SupabaseClient,
  User,
  UserResponse,
} from "@supabase/supabase-js";
import { Context } from "hono";

type supabaseClientConnectionWithUser = {
  user: User;
  supaClient: SupabaseClient;
};

function createSupabaseClient(c: Context): SupabaseClient {
  const supaClient = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);
  return supaClient;
}

async function createSupabaseClientAndConnectUser(
  c: Context
): Promise<supabaseClientConnectionWithUser> {
  const supaClient = createSupabaseClient(c);
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const {
      data: { user },
    } = await supaClient.auth.getUser(token);
    if (!user) {
      throw new Error("Unauthorized");
    }
    return { user: user, supaClient: supaClient };
  } else {
    throw new Error("Unauthorized");
  }
}

export { createSupabaseClient, createSupabaseClientAndConnectUser };
