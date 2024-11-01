import { Env, Hono, MiddlewareHandler } from "hono";
import { createSupabaseClientAndConnectUser } from "../superbase/client";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const payeeCreationSchema = z.object({
  name: z.string(),
});

const payeeUpdateSchema = z.object({
  name: z.string(),
  payee_id: z.string(),
});

type payeeResponseType = {
  payee_id: string;
  name: string;
};

const payeeRoutes = new Hono()
  .post(
    "/create",
    zValidator("json", payeeCreationSchema, async (result, c) => {
      if (!result.success) {
        return c.json({ message: "Invalid request body" }, 400);
      }
    }),
    async (c) => {
      // validate user can be signed in
      try {
        const { user, supaClient } = await createSupabaseClientAndConnectUser(
          c
        );
        const body = await c.req.json();
        const payeeName = body["name"];
        // Adds payee to payees db and then gets the new id
        const { data: payeeData, error: payeeError } = await supaClient
          .from("payees")
          .insert([{ name: payeeName }])
          .select("payee_id")
          .single();

        if (!payeeData && payeeError) {
          return c.json(
            { message: "An error has occured creating payee" },
            500
          );
        }

        const newPayeeId = payeeData.payee_id;

        // Add payee to join table with user_id
        const { error: joinError } = await supaClient
          .from("payee_user_join")
          .insert([{ payee_id: newPayeeId, user_id: user.id }]);

        if (joinError) {
          const { error: removePayeeError } = await supaClient
            .from("payees")
            .delete()
            .eq("payee_id", newPayeeId);
          return c.json(
            { message: "An error has occured adding payee to join table" },
            500
          );
        }
        return c.json({ message: "Successfully created a payee" }, 200);
      } catch (err) {
        if (err instanceof Error && err.message === "Unauthorized")
          return c.json({ message: "Unauthorized" }, 401);
        return c.json({ message: "Server Error" }, 500);
      }
    }
  )
  .get("/get", async (c) => {
    try {
      const { user, supaClient } = await createSupabaseClientAndConnectUser(c);
      const { data: payeeData, error: payeeError } = await supaClient
        .from("payee_user_join")
        .select("...payees(payee_id, name)")
        .eq("user_id", user.id);

      if (payeeError) {
        return c.json({ message: "An error occured getting payees" }, 500);
      }
      return c.json(payeeData);
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized")
        return c.json({ message: "Unauthorized" }, 401);
      return c.json({ message: "An error occured getting payees" }, 500);
    }
  })
  .put(
    "/update",
    zValidator("json", payeeUpdateSchema, async (result, c) => {
      if (!result.success) {
        return c.json({ message: "Invalid request body" }, 400);
      }
    }),
    async (c) => {
      try {
        const { user, supaClient } = await createSupabaseClientAndConnectUser(
          c
        );
        const body = await c.req.json();
        const payeeName = body["name"];
        const payeeId = body["payee_id"];

        const { data: validateAccessData, error: validateAccessError } =
          await supaClient
            .from("payee_user_join")
            .select("...payees(payee_id, name)")
            .eq("user_id", user.id)
            .eq("payee_id", payeeId);

        if (
          !validateAccessData ||
          validateAccessData.length <= 0 ||
          validateAccessError
        ) {
          return c.json({ message: "Unauthorized" }, 401);
        }

        const { data: payeeData, error: payeeError } = await supaClient
          .from("payees")
          .update([{ name: payeeName }])
          .eq("account_id", payeeId);

        if (payeeError) {
          return c.json(
            { message: "An error occured updating the payee" },
            500
          );
        }
        return c.json({ message: "Successfully updated payee" }, 200);
      } catch (err) {
        if (err instanceof Error && err.message === "Unauthorized") {
          return c.json({ message: "Unauthorized" }, 401);
        }
        return c.json({ message: "An error occured updating the payee" });
      }
    }
  );

export default payeeRoutes;
