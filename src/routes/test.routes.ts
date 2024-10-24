import { Hono } from "hono";
import createSupabaseClient from "../superbase/client";

const testRoutes = new Hono().get("/test", async (c) => {
  const supaClient = createSupabaseClient(c);
  let { data, error } = await supaClient.from("Accounts").select("*");
  console.log(data);
  return c.text("Hello World");
});

export default testRoutes;
