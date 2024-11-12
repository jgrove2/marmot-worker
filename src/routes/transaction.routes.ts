import { Hono } from "hono";
import { createSupabaseClientAndConnectUser } from "../superbase/client";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const transactionCreateString = z.object({
  payee_id: z.number(),
  category_id: z.number(),
  date: z.string().date(),
  account_id: z.number(),
  transaction_amount: z.number(),
});

const transactionUpdateSchema = z.object({
  transaction_amount: z.number().optional(),
  transaction_id: z.string(),
  payee_id: z.string().optional(),
  category_id: z.string().optional(),
  date: z.date().optional(),
  account_id: z.string().optional(),
});

const transactionRoutes = new Hono()
  .post(
    "/create",
    zValidator("json", transactionCreateString, async (result, c) => {
      if (!result.success) {
        console.log(result?.error);
        return c.json({ message: "Invalid request body" }, 400);
      }
    }),
    async (c) => {
      console.log("test");
      try {
        const { user, supaClient } = await createSupabaseClientAndConnectUser(
          c
        );
        const body = await c.req.json();
        const payeeId = body["payee_id"];
        const categoryId = body["category_id"];
        const transactionDate = body["date"];
        const accountId = body["account_id"];
        const amount = body["transaction_amount"];
        console.log("got data");
        const { data: groupData, error: groupError } = await supaClient
          .from("category_group_join")
          .select("group_id")
          .eq("category_id", categoryId)
          .single();

        if (groupError) {
          console.error(groupError);
          return c.json({ message: "Error occurred invalid category id" });
        }
        const { error: categoryError } = await supaClient
          .from("group_user_join")
          .select("group_id")
          .eq("user_id", user.id)
          .eq("group_id", groupData.group_id);
        if (categoryError) {
          console.error(categoryError);
          return c.json({ message: "Error ocurred invalid category id" }, 500);
        }
        const { error: accountError } = await supaClient
          .from("account_user_join")
          .select("account_id")
          .eq("user_id", user.id)
          .eq("account_id", accountId);
        if (accountError) {
          console.error(accountError);
          return c.json({ message: "Error ocurred invalid account_id" }, 500);
        }
        const { error: payeeError } = await supaClient
          .from("payee_user_join")
          .select("payee_id")
          .eq("user_id", user.id)
          .eq("payee_id", payeeId);
        if (accountError) {
          console.error(accountError);
          return c.json({ message: "Error ocurred invalid payee_id" }, 500);
        }

        const { data: transactionData, error: transactionError } =
          await supaClient
            .from("transactions")
            .insert([{ amount: amount, transaction_date: transactionDate }])
            .select("transaction_id")
            .single();

        if (transactionError) {
          return c.json(
            { message: "An error ocurred creating transaction" },
            500
          );
        }
        console.log("created transaction");
        const newTransactionId = transactionData.transaction_id;

        const { error: tpJoinError } = await supaClient
          .from("transaction_payee_join")
          .insert([{ transaction_id: newTransactionId, payee_id: payeeId }]);

        if (tpJoinError) {
          console.error(tpJoinError);
          const { error: removePayeeError } = await supaClient
            .from("transactions")
            .delete()
            .eq("transaction_id", newTransactionId);
          return c.json(
            { message: "An error occurred creating transaction" },
            500
          );
        }

        const { error: ctJoinError } = await supaClient
          .from("transaction_category_join")
          .insert([
            { transaction_id: newTransactionId, category_id: categoryId },
          ]);
        if (ctJoinError) {
          console.error(ctJoinError);
          const { error: removePayeeError } = await supaClient
            .from("transactions")
            .delete()
            .eq("transaction_id", newTransactionId);
          return c.json(
            { message: "An error occurred creating transaction" },
            500
          );
        }
        const { error: atJoinError } = await supaClient
          .from("transaction_account_join")
          .insert([
            { transaction_id: newTransactionId, account_id: accountId },
          ]);
        if (atJoinError) {
          console.error(atJoinError);
          const { error: removePayeeError } = await supaClient
            .from("transactions")
            .delete()
            .eq("transaction_id", newTransactionId);
          return c.json(
            { message: "An error occurred creating transaction" },
            500
          );
        }

        return c.json({ message: "Transaction added successfully" }, 200);
      } catch (err) {
        console.error(err);
        if (err instanceof Error && err.message === "Unauthorized")
          return c.json({ message: "Unauthorized" }, 401);
        return c.json({ message: "Server Error" }, 500);
      }
    }
  )
  .get("/get/account/:accountId", async (c) => {
    try {
      const { user, supaClient } = await createSupabaseClientAndConnectUser(c);
      const accountId = c.req.param("accountId");

      const { data: accountData, error: accountError } = await supaClient
        .from("account_user_join")
        .select("account_id")
        .eq("user_id", user.id)
        .eq("account_id", accountId);
      if (accountError) {
        console.error(accountError);
        return c.json(
          { message: "Error ocurred getting transactions for account" },
          500
        );
      }
      const { data: transactions, error: transactionError } = await supaClient
        .from("transaction_account_join")
        .select("...transactions(transaction_id, amount, transaction_date)")
        .eq("account_id", accountId);

      if (transactionError) {
        console.error(transactionError);
        return c.json({
          message: "Error occurred getting transactions for account",
        });
      }
      return c.json(transactions);
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        return c.json({ message: "Unauthorized" }, 401);
      }
      return c.json({ message: "Error occurred getting transactions" }, 500);
    }
  })
  .get("/get/category/:categoryId", async (c) => {
    try {
      const { user, supaClient } = await createSupabaseClientAndConnectUser(c);
      const categoryId = c.req.param("categoryId");
      const { data: groupData, error: groupError } = await supaClient
        .from("category_group_join")
        .select("group_id")
        .eq("category_id", categoryId)
        .single();

      if (groupError) {
        console.error(groupError);
        return c.json({
          message: "Error occurred getting transactions for a category",
        });
      }
      const { error: categoryError } = await supaClient
        .from("group_user_join")
        .select("group_id")
        .eq("user_id", user.id)
        .eq("group_id", groupData.group_id);
      if (categoryError) {
        console.error(categoryError);
        return c.json(
          { message: "Error ocurred getting transactions for account" },
          500
        );
      }
      const { data: transactions, error: transactionError } = await supaClient
        .from("transaction_category_join")
        .select("...transactions(transaction_id, amount, transaction_date)")
        .eq("category_id", categoryId);

      if (transactionError) {
        console.error(transactionError);
        return c.json({
          message: "Error occurred getting transactions for categories",
        });
      }
      return c.json(transactions);
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        return c.json({ message: "Unauthorized" }, 401);
      }
      return c.json({ message: "Error occurred getting transactions" }, 500);
    }
  });
export default transactionRoutes;
