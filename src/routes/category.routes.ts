import { Hono } from "hono";
import { createSupabaseClientAndConnectUser } from "../superbase/client";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const categoryCreationSchema = z.object({
  name: z.string(),
  group_id: z.string()
});

const categoryUpdateSchema = z.object({
  name: z.string(),
  category_id: z.string(),
});

const categoryRoutes = new Hono()
  .post(
    "/create",
    zValidator("json", categoryCreationSchema, async (result, c) => {
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
        const categoryName = body["name"];
        const group_id = body["group_id"]
        const { data: categoryData, error: categoryError } = await supaClient
          .from("categories")
          .insert([{ name: categoryName }])
          .select("category_id")
          .single();

        if (categoryError) {
          return c.json({ message: "An error ocurred creating category" }, 500);
        }

        const newCategoryId = categoryData.category_id;

        const { error: joinError } = await supaClient
          .from("category_group_join")
          .insert([{ group_id: group_id, category_id: newCategoryId }]);

        if (joinError) {
          const { error: removePayeeError } = await supaClient
            .from("categories")
            .delete()
            .eq("category_id", newCategoryId);
          return c.json({ message: "An error occurred creating category" }, 500);
        }
        return c.json({ message: "Category added successfully" }, 200);
      } catch (err) {
        if (err instanceof Error && err.message === "Unauthorized")
          return c.json({ message: "Unauthorized" }, 401);
        return c.json({ message: "Server Error" }, 500);
      }
    }
  )
  .get("/get/:groupId", async (c) => {
    try {
      const { user, supaClient } = await createSupabaseClientAndConnectUser(c);
      const groupId = c.req.param('groupId')
      const { data: groupData, error: groupError } = await supaClient
        .from("group_user_join")
        .select("group_id")
        .eq("user_id", user.id)
        .eq("group_id", groupId);
      if (groupError) {
        console.error(groupError);
        return c.json({ message: "Error ocurred getting categories for group" }, 500);
      }
      const {data: categories, error: categoryError} = await supaClient
      .from("category_group_join")
      .select("...categories(category_id, name)")
      .eq("group_id", groupId)

      if(categoryError) {
        console.error(categoryError)
        return c.json({message: "Error occurred getting categories for group"})
      }
      return c.json(categories);
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        return c.json({ message: "Unauthorized" }, 401);
      }
      return c.json({ message: "Error occured getting groups" }, 500);
    }
  })
  .put(
    "/update",
    zValidator("json", categoryUpdateSchema, async (result, c) => {
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
        const categoryName = body["name"];
        const categoryId = body["category_id"];

        const {data: groupId, error: categoryGetError } = await supaClient.from("category_group_join")
        .select('group_id')
        .eq("category_id", categoryName)
        .single()

        if(categoryGetError || !groupId) {
            return c.json({message: "Invalid update request for categories"})
        }

        const { data: validateAccessData, error: validateAccessError } =
          await supaClient
            .from("group_user_join")
            .select("...groups(group_id, name)")
            .eq("user_id", user.id)
            .eq("group_id", groupId.group_id);

        if (
          !validateAccessData ||
          validateAccessData.length <= 0 ||
          validateAccessError
        ) {
          return c.json({ message: "Unauthorized" }, 401);
        }

        const { data: categoryData, error: categoryError } = await supaClient
          .from("groups")
          .update([{ name: categoryName }])
          .eq("account_id", categoryId);

        if (categoryError) {
          return c.json({ message: "An error occurred updating categories" }, 500);
        }
        return c.json({ message: `Successfully updated category: ${categoryId}` }, 200);
      } catch (err) {
        if (err instanceof Error && err.message === "Unauthorized") {
          return c.json({ message: "Unauthorized" }, 401);
        }
        return c.json({ message: `An error occurred updating category` });
      }
    }
  );

export default categoryRoutes;

