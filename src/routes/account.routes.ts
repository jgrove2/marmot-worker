import { Hono } from "hono";
import { createSupabaseClientAndConnectUser } from "../superbase/client";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const accountCreationSchema = z.object({
  name: z.string(),
  balance: z.bigint(),
});

const accountUpdateSchema = z.object({
  account_id: z.string(),
  name: z.string(),
  balance: z.string(),
});

const accountRoutes = new Hono()
  .post(
    "/create",
    zValidator("json", accountCreationSchema, async (result, c) => {
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
        const accountName = body["name"];
        const startingBalance = body["balance"];
        const { data: accountData, error: accountError } = await supaClient
          .from("accounts")
          .insert([{ name: accountName, balance: startingBalance }])
          .select("account_id")
          .single();

        if (accountError) {
          return c.json(
            { message: "An error occured creating the account" },
            500
          );
        }

        const newAccountId = accountData.account_id;

        // Step 2: Add the user to the new group
        const { error: joinError } = await supaClient
          .from("accounts_user_join")
          .insert([{ account_id: newAccountId, user_id: user.id }]);

        if (joinError) {
          return c.json(
            { message: "An error has occured creating the new account" },
            500
          );
        }
        return c.json({ message: "Successfully added new account" }, 200);
      } catch (err) {
        if (err instanceof Error && err.message === "Unauthorized") {
          return c.json({ message: "Unauthorized" }, 401);
        }
        return c.json({ message: "An error occured creating the account" });
      }
    }
  )
  .get("/get", async (c) => {
    try {
      const { user, supaClient } = await createSupabaseClientAndConnectUser(c);
      const { data: accountData, error: accountError } = await supaClient
        .from("accounts_user_join")
        .select("...accounts(account_id, name, balance)")
        .eq("user_id", user.id);

      if (accountError) {
        return c.json(
          { message: "An error has occured getting accounts" },
          500
        );
      }
      return c.json(accountData);
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        return c.json({ message: "Unauthorized" }, 401);
      }
      return c.json({ message: "An error occured getting account data" });
    }
  })
  .put(
    "/update",
    zValidator("json", accountUpdateSchema, async (result, c) => {
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
        const accountName = body["name"];
        const startingBalance = body["balance"];
        const accountId = body["account_id"];

        const { data: validateAccessData, error: validateAccessError } =
          await supaClient
            .from("accounts_user_join")
            .select("...accounts(account_id, name, balance)")
            .eq("user_id", user.id)
            .eq("account_id", accountId);

        if (
          !validateAccessData ||
          validateAccessData.length <= 0 ||
          validateAccessError
        ) {
          return c.json({ message: "Unauthorized" }, 401);
        }

        const { data: accountData, error: accountError } = await supaClient
          .from("accounts")
          .update([{ name: accountName, balance: startingBalance }])
          .eq("account_id", accountId);

        if (accountError) {
          return c.json(
            { message: "An error occured creating the account" },
            500
          );
        }
        return c.json({ message: "Successfully updated account" }, 200);
      } catch (err) {
        if (err instanceof Error && err.message === "Unauthorized") {
          return c.json({ message: "Unauthorized" }, 401);
        }
        return c.json({ message: "An error occured creating the account" });
      }
    }
  );

export default accountRoutes;
