import { Hono } from "hono";
import { createSupabaseClientAndConnectUser } from "../superbase/client";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const groupCreationSchema = z.object({
  name: z.string(),
});

const groupUpdateSchema = z.object({
  name: z.string(),
  group_id: z.string(),
});

const groupRoutes = new Hono()
  .post(
    "/create",
    zValidator("json", groupCreationSchema, async (result, c) => {
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
        const groupName = body["name"];
        const { data: groupData, error: groupError } = await supaClient
          .from("groups")
          .insert([{ name: groupName }])
          .select("group_id")
          .single();

        if (groupError) {
          return c.json({ message: "An error occured creating group" }, 500);
        }

        const newGroupId = groupData.group_id;

        const { error: joinError } = await supaClient
          .from("group_user_join")
          .insert([{ group_id: newGroupId, user_id: user.id }]);

        if (joinError) {
          const { error: removePayeeError } = await supaClient
            .from("groups")
            .delete()
            .eq("group_id", newGroupId);
          return c.json({ message: "An error occured creating group" }, 500);
        }
        return c.json({ message: "Group added successfully" }, 200);
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
      const { data: groupData, error: groupError } = await supaClient
        .from("group_user_join")
        .select("...groups(group_id, name)")
        .eq("user_id", user.id);
      if (groupError) {
        console.error(groupError);
        return c.json({ message: "Error occured getting groups" }, 500);
      }
      return c.json(groupData);
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        return c.json({ message: "Unauthorized" }, 401);
      }
      return c.json({ message: "Error occured getting groups" }, 500);
    }
  })
  .put(
    "/update",
    zValidator("json", groupUpdateSchema, async (result, c) => {
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
        const groupName = body["name"];
        const groupId = body["group_id"];

        const { data: validateAccessData, error: validateAccessError } =
          await supaClient
            .from("group_user_join")
            .select("...groups(group_id, name)")
            .eq("user_id", user.id)
            .eq("account_id", groupId);

        if (
          !validateAccessData ||
          validateAccessData.length <= 0 ||
          validateAccessError
        ) {
          return c.json({ message: "Unauthorized" }, 401);
        }

        const { data: accountData, error: accountError } = await supaClient
          .from("groups")
          .update([{ name: groupName }])
          .eq("account_id", groupId);

        if (accountError) {
          return c.json({ message: "An error occured updating groups" }, 500);
        }
        return c.json({ message: "Successfully updated groups" }, 200);
      } catch (err) {
        if (err instanceof Error && err.message === "Unauthorized") {
          return c.json({ message: "Unauthorized" }, 401);
        }
        return c.json({ message: "An error occured updating groups" });
      }
    }
  );

export default groupRoutes;
